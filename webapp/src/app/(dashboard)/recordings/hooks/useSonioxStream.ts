"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  // NEW: Track when the current WebSocket session started (for proactive token refresh)
  const sessionStartedAtRef = useRef<number | null>(null);
  const proactiveCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<SonioxStreamState>({
    connected: false,
    error: null,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectMaxAttempts: 6
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

    // NEW: Clear proactive refresh interval
    if (proactiveCheckIntervalRef.current) {
      clearInterval(proactiveCheckIntervalRef.current);
      proactiveCheckIntervalRef.current = null;
    }

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
      sessionStartedAtRef.current = null; // NEW: Clear session timer
    }
    setState((prev) => ({ ...prev, connected: false }));
  }, [cancelReconnect]);

  // Core reconnection function with exponential backoff + jitter
  const reconnect = useCallback(async (
    attempt: number = 1,
    isPlanned: boolean = false  // NEW: Flag for proactive token refresh vs error recovery
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

    // NEW: Show different message for planned refresh vs error recovery
    const logPrefix = isPlanned ? "Proactive token refresh" : "Reconnect";
    const uiMessage = isPlanned
      ? "Refreshing connection..."
      : `Reconnecting... (${attempt}/${MAX_ATTEMPTS})`;

    console.log(`[useSonioxStream] ${logPrefix} attempt ${attempt}/${MAX_ATTEMPTS} in ${delayMs}ms`);

    // Update UI state
    setState(prev => ({
      ...prev,
      reconnecting: true,
      reconnectAttempt: attempt,
      error: uiMessage
    }));

    const actions = currentActionsRef.current;
    if (actions) {
      actions.fail(uiMessage);
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

          // NEW: Reset session timer for proactive token refresh
          sessionStartedAtRef.current = Date.now();
          console.log("[useSonioxStream] Session timer reset - next proactive refresh in 25 seconds");
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

  // NEW: Proactive token refresh - check every 5 seconds, refresh at 25 seconds
  useEffect(() => {
    // Only run when connected and not already reconnecting
    if (!state.connected || isReconnectingRef.current) {
      return;
    }

    const REFRESH_INTERVAL_MS = 25 * 1000; // 25 seconds (for testing - will be 55 minutes in production)
    const CHECK_INTERVAL_MS = 5 * 1000;   // Check every 5 seconds

    const checkTimer = setInterval(() => {
      const sessionStart = sessionStartedAtRef.current;
      if (!sessionStart) {
        console.log("[useSonioxStream] No session start time - skipping proactive refresh check");
        return;
      }

      const elapsed = Date.now() - sessionStart;
      console.log(`[useSonioxStream] Proactive refresh check: ${Math.floor(elapsed / 1000)}s / ${REFRESH_INTERVAL_MS / 1000}s elapsed`);

      if (elapsed >= REFRESH_INTERVAL_MS) {
        console.log("[useSonioxStream] ⏰ Triggering proactive token refresh at 25 seconds");

        // Clear this interval - reconnect will start its own
        clearInterval(checkTimer);

        // Trigger planned reconnection
        isReconnectingRef.current = true;
        reconnect(1, true); // isPlanned = true
      }
    }, CHECK_INTERVAL_MS);

    proactiveCheckIntervalRef.current = checkTimer;

    return () => {
      clearInterval(checkTimer);
      proactiveCheckIntervalRef.current = null;
    };
  }, [state.connected, reconnect]);

  const start = useCallback(
    async ({ apiKey, websocketUrl, stream, actions }: StartStreamParams) => {
      stop({ resetStart: true });
      setState({
        connected: false,
        error: null,
        reconnecting: false,
        reconnectAttempt: 0,
        reconnectMaxAttempts: 6
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

            // NEW: Start session timer for proactive token refresh
            sessionStartedAtRef.current = Date.now();
            console.log("[useSonioxStream] Session timer started - proactive refresh in 25 seconds");
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
    [processTokens, stop, reconnect],
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
