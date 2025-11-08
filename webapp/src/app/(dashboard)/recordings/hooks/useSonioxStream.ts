"use client";

import { useCallback, useRef, useState } from "react";

import type { RecordingActions } from "../components/RecordingConsole";

type SonioxModule = typeof import("@soniox/speech-to-text-web");
type SonioxClientConstructor = SonioxModule["SonioxClient"];
type SonioxClientInstance = import("@soniox/speech-to-text-web").SonioxClient;

interface StartStreamParams {
  apiKey: string;
  websocketUrl?: string | null;
  stream: MediaStream;
  actions: RecordingActions;
}

interface SonioxStreamState {
  connected: boolean;
  error: string | null;
  reconnecting: boolean;           // Are we in reconnect loop?
  reconnectAttempt: number;        // Current attempt (1-6)
  reconnectMaxAttempts: number;    // Max attempts before giving up
  refreshing: boolean;             // Are we proactively cycling the session?
}

interface TranscriptSegment {
  speaker: string;
  text: string;
}

interface SonioxToken {
  text?: string;
  is_final?: boolean;
  speaker?: number | string;
  speaker_id?: number | string;
  speaker_tag?: number | string;
  speakerTag?: number | string;
  speaker_index?: number | string;
  speakerIndex?: number | string;
  spk?: number | string;
  spk_id?: number | string;
  channel?: number | string;
}

const DEFAULT_MODEL = "stt-rt-preview";

// Proactive session cycling to prevent token expiration
// Token expires at 60 minutes, we cycle at 55 minutes (5-minute safety buffer)
// Set to 45 seconds for testing, 55 minutes for production
// const PROACTIVE_CYCLE_INTERVAL = 55 * 60 * 1000; // 55 minutes
const PROACTIVE_CYCLE_INTERVAL = 45 * 1000; // 45 seconds (FOR TESTING ONLY)

let sonioxModulePromise: Promise<SonioxModule> | null = null;

async function loadSonioxClient(): Promise<SonioxClientConstructor> {
  if (!sonioxModulePromise) {
    sonioxModulePromise = import("@soniox/speech-to-text-web");
  }

  const sonioxModule = await sonioxModulePromise;
  return sonioxModule.SonioxClient;
}

// Error classification for reconnection strategy
function isRecoverableError(status: string, message: string): boolean {
  // Network-related errors - ALWAYS recoverable
  if (status === 'websocket_error') return true;

  // Check message content for network keywords
  const msg = message.toLowerCase();
  const networkKeywords = [
    'network',
    'connection',
    'timeout',
    'disconnect',
    'econnrefused',
    'enotfound',
    'enetunreach',
    'websocket',
    'socket closed'
  ];

  if (networkKeywords.some(keyword => msg.includes(keyword))) {
    return true;
  }

  // API errors are NOT recoverable (auth, rate limit, etc)
  if (status === 'api_error') return false;

  // Permission errors are NOT recoverable
  if (status === 'get_user_media_failed') return false;

  // Default: treat unknown errors as non-recoverable (conservative)
  return false;
}

// Generate jitter to avoid thundering herd problem
function getJitter(maxJitterMs: number = 500): number {
  return Math.floor(Math.random() * maxJitterMs);
}

export function useSonioxStream() {
  const clientRef = useRef<SonioxClientInstance | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const finalSegmentsRef = useRef<TranscriptSegment[]>([]);
  const speakerMapRef = useRef<Map<string, string>>(new Map());

  // Refs for reconnection state tracking
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const currentActionsRef = useRef<RecordingActions | null>(null);
  const isReconnectingRef = useRef(false);

  // Refs for proactive session cycling (prevents token expiration)
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const [state, setState] = useState<SonioxStreamState>({
    connected: false,
    error: null,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectMaxAttempts: 6,
    refreshing: false
  });

  // Critical token filter (from results.md) - prevents control artifacts like "end end"
  const isDisplayableTokenText = useCallback((text: string): boolean => {
    if (!text) return false;
    const t = String(text);
    if (!t.trim()) return false;
    const low = t.trim().toLowerCase();
    if (low === 'end' || low === 'endpoint') return false;         // hide endpoint markers
    if (/^<[^>]+>$/.test(t)) return false;                         // hide <eos>/<...> style
    return true;
  }, []);

  const labelForSpeaker = useCallback((speakerId: number | string) => {
    const key = String(speakerId);
    if (!speakerMapRef.current.has(key)) {
      const nextIndex = speakerMapRef.current.size + 1;
      speakerMapRef.current.set(key, `Speaker ${nextIndex}`);
    }
    return speakerMapRef.current.get(key) ?? "Speaker";
  }, []);

  const appendFinalSegment = useCallback((speaker: string, text: string) => {
    const segments = finalSegmentsRef.current;
    if (segments.length === 0 || segments[segments.length - 1].speaker !== speaker) {
      segments.push({ speaker, text });
    } else {
      segments[segments.length - 1].text += text;
    }
  }, []);


  const buildLiveFromNonFinals = useCallback((currentNonFinalTokens: SonioxToken[]): TranscriptSegment[] => {
    // Deep clone all final segments first (exactly like results.md cloneSegments())
    const cumulative = finalSegmentsRef.current.map(s => ({ speaker: s.speaker, text: s.text }));

    // Add ONLY current non-final tokens (don't persist between calls)
    currentNonFinalTokens.forEach((token) => {
      const text = (token?.text ?? "").toString();
      if (!isDisplayableTokenText(text)) return;

      const speakerId =
        token?.speaker ??
        token?.speaker_id ??
        token?.speaker_tag ??
        token?.speakerTag ??
        token?.speaker_index ??
        token?.speakerIndex ??
        token?.spk ??
        token?.spk_id ??
        token?.channel ??
        0;
      const speakerLabel = labelForSpeaker(speakerId);

      if (cumulative.length === 0 || cumulative[cumulative.length - 1].speaker !== speakerLabel) {
        cumulative.push({ speaker: speakerLabel, text });
      } else {
        cumulative[cumulative.length - 1].text += text;
      }
    });

    return cumulative;
  }, [labelForSpeaker, isDisplayableTokenText]);

  const processTokens = useCallback(
    (tokens: SonioxToken[], actions: RecordingActions) => {
      // Process final tokens (exactly like results.md)
      tokens.forEach((token) => {
        if (token?.is_final) {
          const text = (token?.text ?? "").toString();
          if (!isDisplayableTokenText(text)) return;

          const speakerId =
            token?.speaker ??
            token?.speaker_id ??
            token?.speaker_tag ??
            token?.speakerTag ??
            token?.speaker_index ??
            token?.speakerIndex ??
            token?.spk ??
            token?.spk_id ??
            token?.channel ??
            0;
          const speakerLabel = labelForSpeaker(speakerId);
          appendFinalSegment(speakerLabel, text);
        }
      });

      // Filter to get ONLY current non-final tokens (exactly like results.md)
      const nonFinalTokens = tokens.filter(t => !t?.is_final);

      // Build live from finals + current non-finals only
      const cumulativeLive = buildLiveFromNonFinals(nonFinalTokens);

      actions.updateFinal([...finalSegmentsRef.current], speakerMapRef.current.size);
      actions.updateLive(cumulativeLive, speakerMapRef.current.size);
    },
    [appendFinalSegment, labelForSpeaker, buildLiveFromNonFinals, isDisplayableTokenText],
  );

  // Cancel any pending reconnection attempts
  const cancelReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isReconnectingRef.current = false;
    setState((prev) => ({
      ...prev,
      reconnecting: false,
      reconnectAttempt: 0
    }));
  }, []);

  const stop = useCallback((options?: { resetStart?: boolean }) => {
    // Cancel any pending reconnection
    cancelReconnect();

    // Cancel any pending proactive cycle
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    isRefreshingRef.current = false;

    if (clientRef.current) {
      try {
        clientRef.current.stop();
      } catch (error) {
        console.warn("Soniox stop error", error);
      }
      clientRef.current = null;
    }

    // Clear refs
    currentStreamRef.current = null;
    currentActionsRef.current = null;

    if (options?.resetStart) {
      startedAtRef.current = null;
    }
    setState((prev) => ({ ...prev, connected: false, refreshing: false }));
  }, [cancelReconnect]);

  // Core reconnection function with exponential backoff + jitter
  const reconnect = useCallback(async (
    attempt: number = 1
  ): Promise<void> => {
    const MAX_ATTEMPTS = state.reconnectMaxAttempts;

    // Prevent multiple simultaneous reconnection attempts
    if (attempt === 1 && isReconnectingRef.current) {
      console.log("[useSonioxStream] Reconnection already in progress, skipping");
      return;
    }

    // Give up after max attempts
    if (attempt > MAX_ATTEMPTS) {
      console.error(`[useSonioxStream] Reconnection failed after ${MAX_ATTEMPTS} attempts`);

      const actions = currentActionsRef.current;
      if (actions) {
        actions.fail("Connection lost. Recording saved locally and will upload when online.");
      }

      setState(prev => ({
        ...prev,
        connected: false,
        reconnecting: false,
        reconnectAttempt: 0,
        error: "Connection lost after multiple retry attempts"
      }));

      // Properly clean up the old client
      if (clientRef.current) {
        try {
          clientRef.current.cancel(); // Use cancel() instead of stop() for immediate termination
        } catch (err) {
          console.warn("[useSonioxStream] Error canceling client during failed reconnect", err);
        }
        clientRef.current = null;
      }

      isReconnectingRef.current = false;
      return;
    }

    // Calculate delay: exponential backoff with jitter
    // Attempt 1: 0ms, Attempt 2: 1s, Attempt 3: 2s, Attempt 4: 4s, etc.
    const baseDelay = attempt === 1 ? 0 : Math.pow(2, attempt - 2) * 1000;
    const jitter = attempt === 1 ? 0 : getJitter(500);
    const delayMs = Math.min(baseDelay + jitter, 16000); // Cap at 16s

    console.log(`[useSonioxStream] Reconnect attempt ${attempt}/${MAX_ATTEMPTS} in ${delayMs}ms`);

    // Update UI state
    setState(prev => ({
      ...prev,
      reconnecting: true,
      reconnectAttempt: attempt,
      error: `Reconnecting... (${attempt}/${MAX_ATTEMPTS})`
    }));

    const actions = currentActionsRef.current;
    if (actions) {
      actions.fail(`Reconnecting... (${attempt}/${MAX_ATTEMPTS})`);
    }

    // Wait with exponential backoff
    await new Promise<void>(resolve => {
      reconnectTimeoutRef.current = setTimeout(resolve, delayMs);
    });

    // Check if reconnection was cancelled (e.g., user manually stopped)
    if (!isReconnectingRef.current) {
      console.log("[useSonioxStream] Reconnection cancelled");
      return;
    }

    try {
      // Properly clean up the old client BEFORE creating a new one
      if (clientRef.current) {
        console.log("[useSonioxStream] Cleaning up old client before reconnect");
        try {
          clientRef.current.cancel(); // Use cancel() for immediate termination
        } catch (err) {
          console.warn("[useSonioxStream] Error cleaning up old client", err);
        }
        clientRef.current = null;
      }

      // Fetch NEW token (old one might be stale)
      console.log("[useSonioxStream] Fetching fresh Soniox token for reconnect");
      const tokenResponse = await fetch("/api/soniox/token", { method: "POST" });
      if (!tokenResponse.ok) {
        throw new Error(`Token fetch failed: ${tokenResponse.status}`);
      }
      const tokenData = await tokenResponse.json();

      if (!tokenData.apiKey) {
        throw new Error("Token response missing apiKey");
      }

      // Get saved MediaStream reference
      const stream = currentStreamRef.current;
      if (!stream) {
        throw new Error("MediaStream reference lost during reconnection");
      }

      // Create NEW Soniox client instance (old one is dead)
      const SonioxClientCtor = await loadSonioxClient();
      const client = new SonioxClientCtor({
        apiKey: tokenData.apiKey,
        webSocketUri: tokenData.websocketUrl ?? undefined,
        onStarted: () => {
          console.log("[useSonioxStream] Reconnection successful!");
          setState(prev => ({
            ...prev,
            connected: true,
            reconnecting: false,
            reconnectAttempt: 0,
            error: null
          }));

          // DON'T call actions.setLive() - we're already live, just reconnected
          // The startedAt timestamp should NOT change
          isReconnectingRef.current = false;
        },
        onPartialResult: (result: { tokens?: SonioxToken[] }) => {
          try {
            const actions = currentActionsRef.current;
            if (actions) {
              processTokens(result?.tokens ?? [], actions);
            }
          } catch (error) {
            console.warn("[useSonioxStream] Partial result error after reconnect", error);
          }
        },
        onFinished: () => {
          console.log("[useSonioxStream] Soniox finished after reconnect");
          const actions = currentActionsRef.current;
          if (actions) {
            actions.updateLive([...finalSegmentsRef.current], speakerMapRef.current.size);
          }
          stop({ resetStart: true });
        },
        onError: (status: string, message: string) => {
          console.error("[useSonioxStream] Error during reconnect", { status, message });

          // Check if we're still supposed to be reconnecting
          if (!isReconnectingRef.current) {
            console.log("[useSonioxStream] Ignoring error during aborted reconnection");
            return;
          }

          // Recursive: retry again if it's still recoverable
          if (isRecoverableError(status, message)) {
            // Add a delay before recursive retry to prevent rapid-fire
            setTimeout(() => {
              if (isReconnectingRef.current) {
                reconnect(attempt + 1);
              }
            }, 500);
          } else {
            // Non-recoverable error during reconnect - give up
            const errorMessage = message || status || "Stream error during reconnection";
            const actions = currentActionsRef.current;
            if (actions) {
              actions.fail(errorMessage);
            }
            setState(prev => ({
              ...prev,
              connected: false,
              reconnecting: false,
              reconnectAttempt: 0,
              error: errorMessage
            }));
            stop({ resetStart: true });
            isReconnectingRef.current = false;
          }
        }
      });

      clientRef.current = client;

      // Restart WebSocket with SAME config as original
      await client.start({
        model: DEFAULT_MODEL,
        stream,
        enableSpeakerDiarization: true,
        enableLanguageIdentification: true,
        enableEndpointDetection: false,
        languageHints: ["en", "ar"],
      });

      console.log("[useSonioxStream] Reconnect WebSocket started successfully");

    } catch (error) {
      console.error(`[useSonioxStream] Reconnect attempt ${attempt} failed`, error);

      // Check if we should still retry (user might have stopped recording)
      if (!isReconnectingRef.current) {
        console.log("[useSonioxStream] Reconnection aborted by user");
        return;
      }

      // Schedule retry with a small additional delay to prevent rapid-fire retries
      await new Promise(resolve => setTimeout(resolve, 500));

      // Double-check we're still reconnecting after the delay
      if (isReconnectingRef.current) {
        reconnect(attempt + 1);
      }
    }
  }, [processTokens, stop, state.reconnectMaxAttempts]);

  // Proactive session cycling (prevents 60-minute token expiration)
  const proactiveCycle = useCallback(async (): Promise<void> => {
    // Guard: prevent multiple simultaneous cycles
    if (isRefreshingRef.current) {
      console.log("[useSonioxStream] Proactive cycle already in progress, skipping");
      return;
    }

    // Guard: only cycle if we're actually connected and recording
    // Check refs (always current) instead of state (can be stale in closures)
    if (!clientRef.current || !currentStreamRef.current) {
      console.log("[useSonioxStream] Not cycling - not connected or no stream");
      return;
    }

    console.log("[useSonioxStream] 🔄 Starting proactive session cycle (preventing token expiration)");
    isRefreshingRef.current = true;

    // Update UI - show refreshing state (NOT an error!)
    setState(prev => ({
      ...prev,
      refreshing: true
    }));

    const actions = currentActionsRef.current;
    if (actions?.setRefreshing) {
      // Show refreshing UI (different from error reconnecting!)
      actions.setRefreshing("Refreshing connection...");
    }

    try {
      // Step 1: Fetch NEW token (fresh 60-minute token)
      console.log("[useSonioxStream] Fetching fresh Soniox token for cycle");
      const tokenResponse = await fetch("/api/soniox/token", { method: "POST" });
      if (!tokenResponse.ok) {
        throw new Error(`Token fetch failed: ${tokenResponse.status}`);
      }
      const tokenData = await tokenResponse.json();

      if (!tokenData.apiKey) {
        throw new Error("Token response missing apiKey");
      }

      // Step 2: Get current MediaStream (keep using same audio stream!)
      const stream = currentStreamRef.current;
      if (!stream) {
        throw new Error("MediaStream reference lost during cycle");
      }

      // Step 3: Save reference to old client (we'll close it after new one connects)
      const oldClient = clientRef.current;

      // Step 4: Create NEW Soniox client with fresh token
      const SonioxClientCtor = await loadSonioxClient();
      const newClient = new SonioxClientCtor({
        apiKey: tokenData.apiKey,
        webSocketUri: tokenData.websocketUrl ?? undefined,
        onStarted: () => {
          console.log("[useSonioxStream] ✅ Proactive cycle successful! New session connected.");

          // Close old client IMMEDIATELY without triggering callbacks
          // Use cancel() instead of stop() to prevent onFinished from firing
          if (oldClient) {
            try {
              oldClient.cancel();
            } catch (err) {
              console.warn("[useSonioxStream] Error canceling old client during cycle", err);
            }
          }

          // Update state - back to normal connected state
          setState(prev => ({
            ...prev,
            connected: true,
            refreshing: false,
            error: null
          }));

          // DON'T call actions.setLive() - we never stopped being live!
          // The startedAt timestamp stays the SAME (recording duration preserved)
          isRefreshingRef.current = false;

          // CRITICAL: Schedule the NEXT cycle in 55 minutes!
          scheduleCycle();
        },
        onPartialResult: (result: { tokens?: SonioxToken[] }) => {
          try {
            const actions = currentActionsRef.current;
            if (actions) {
              processTokens(result?.tokens ?? [], actions);
            }
          } catch (error) {
            console.warn("[useSonioxStream] Partial result error after cycle", error);
          }
        },
        onFinished: () => {
          console.log("[useSonioxStream] Soniox finished after cycle");
          const actions = currentActionsRef.current;
          if (actions) {
            actions.updateLive([...finalSegmentsRef.current], speakerMapRef.current.size);
          }
          stop({ resetStart: true });
        },
        onError: (status: string, message: string) => {
          console.error("[useSonioxStream] Error during proactive cycle", { status, message });

          // If cycle fails, fall back to error reconnection
          setState(prev => ({
            ...prev,
            refreshing: false
          }));
          isRefreshingRef.current = false;

          // Let the normal error reconnection handle it
          if (isRecoverableError(status, message)) {
            isReconnectingRef.current = true;
            reconnect(1);
          } else {
            const errorMessage = message || status || "Stream error during session cycle";
            const actions = currentActionsRef.current;
            if (actions) {
              actions.fail(errorMessage);
            }
            setState(prev => ({
              ...prev,
              connected: false,
              error: errorMessage
            }));
            stop({ resetStart: true });
          }
        }
      });

      // Step 5: Start new client with SAME config as original
      clientRef.current = newClient;
      await newClient.start({
        model: DEFAULT_MODEL,
        stream,
        enableSpeakerDiarization: true,
        enableLanguageIdentification: true,
        enableEndpointDetection: false,
        languageHints: ["en", "ar"],
      });

      console.log("[useSonioxStream] New session WebSocket started successfully during cycle");

    } catch (error) {
      console.error("[useSonioxStream] Proactive cycle failed", error);

      // Cycle failed - fall back to error reconnection
      setState(prev => ({
        ...prev,
        refreshing: false
      }));
      isRefreshingRef.current = false;

      // Trigger error reconnection as fallback
      isReconnectingRef.current = true;
      reconnect(1);
    }
  }, [processTokens, reconnect, stop]);

  // Schedule the next proactive cycle
  const scheduleCycle = useCallback(() => {
    // Clear any existing timer first
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
    }

    const intervalSeconds = PROACTIVE_CYCLE_INTERVAL / 1000;
    const displayTime = intervalSeconds >= 60
      ? `${intervalSeconds / 60} minutes`
      : `${intervalSeconds} seconds`;
    console.log(`[useSonioxStream] ⏰ Scheduling next proactive cycle in ${displayTime}`);

    cycleTimerRef.current = setTimeout(() => {
      proactiveCycle();
    }, PROACTIVE_CYCLE_INTERVAL);
  }, [proactiveCycle]);

  const start = useCallback(
    async ({ apiKey, websocketUrl, stream, actions }: StartStreamParams) => {
      stop({ resetStart: true });
      setState({
        connected: false,
        error: null,
        reconnecting: false,
        reconnectAttempt: 0,
        reconnectMaxAttempts: 6,
        refreshing: false
      });
      finalSegmentsRef.current = [];
      speakerMapRef.current = new Map();
      startedAtRef.current = Date.now();

      // Save stream and actions refs for reconnection
      currentStreamRef.current = stream;
      currentActionsRef.current = actions;

      try {
        const SonioxClientCtor = await loadSonioxClient();
        const client = new SonioxClientCtor({
          apiKey,
          webSocketUri: websocketUrl ?? undefined,
          onStarted: () => {
            setState(prev => ({
              ...prev,
              connected: true,
              error: null
            }));
            const startedAt = startedAtRef.current ?? Date.now();
            actions.setLive(startedAt);

            // CRITICAL: Start the proactive cycle timer!
            // This will automatically refresh the session at 55 minutes to prevent token expiration
            scheduleCycle();
          },
          onPartialResult: (result: { tokens?: SonioxToken[] }) => {
            try {
              processTokens(result?.tokens ?? [], actions);
            } catch (error) {
              console.warn("Soniox partial error", error);
            }
          },
          onFinished: () => {
            actions.updateLive([...finalSegmentsRef.current], speakerMapRef.current.size);
            stop({ resetStart: true });
          },
          onError: (status: string, message: string) => {
            console.error("[useSonioxStream] Soniox error", { status, message });

            // Immediately cleanup the old client to prevent "WebSocket already CLOSING" errors
            // The old client is broken and should not process any more audio
            const oldClient = clientRef.current;
            if (oldClient) {
              console.log("[useSonioxStream] Immediately cleaning up failed client");
              clientRef.current = null; // Null it out first to prevent further use
              try {
                oldClient.cancel(); // Force immediate termination
              } catch (err) {
                console.warn("[useSonioxStream] Error canceling failed client", err);
              }
            }

            // Check if this error is recoverable (network issues)
            if (isRecoverableError(status, message)) {
              console.log("[useSonioxStream] Recoverable error detected - attempting reconnection");

              // Mark as reconnecting
              isReconnectingRef.current = true;

              // Start reconnection sequence
              reconnect(1);
            } else {
              // Non-recoverable error (API auth, permissions, etc) - fail permanently
              console.error("[useSonioxStream] Non-recoverable error - stopping recording");
              const errorMessage = message || status || "Stream error";
              actions.fail(errorMessage);
              setState(prev => ({
                ...prev,
                connected: false,
                error: errorMessage,
                reconnecting: false,
                reconnectAttempt: 0
              }));
              stop({ resetStart: true });
            }
          },
        });

        clientRef.current = client;
        await client.start({
          model: DEFAULT_MODEL,
          stream,
          enableSpeakerDiarization: true,
          enableLanguageIdentification: true,
          enableEndpointDetection: false,
          languageHints: ["en", "ar"],
        });
      } catch (error) {
        console.error("Soniox start error", error);
        const message = (error as Error).message || "Failed to start stream";
        actions.fail(message);
        setState(prev => ({
          ...prev,
          connected: false,
          error: message
        }));
        stop({ resetStart: true });
        throw error;
      }
    },
    [processTokens, stop, reconnect, scheduleCycle],
  );

  const getTranscriptText = useCallback(() => {

    return finalSegmentsRef.current.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");

  }, []);



  const getFinalSegments = useCallback(() => {
    return finalSegmentsRef.current.map((segment) => ({ ...segment }));
  }, []);

  const getSpeakerCount = useCallback(() => speakerMapRef.current.size, []);

  const getStartTimestamp = useCallback(() => startedAtRef.current, []);

  return {
    state,
    start,
    stop,
    reconnect,           // Expose for manual/proactive reconnection
    cancelReconnect,     // Expose for canceling reconnection
    getTranscriptText,
    getFinalSegments,
    getSpeakerCount,
    getStartTimestamp
  };
}
