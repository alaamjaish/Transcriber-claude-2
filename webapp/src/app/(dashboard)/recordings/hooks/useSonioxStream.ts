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
  sessionSegment: number;          // How many times we've done a hot swap (starts at 1)
  isHotSwapping: boolean;          // Are we currently doing a seamless hot swap?
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

  // Refs for seamless hot swap (proactive token refresh)
  const hotSwapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHotSwappingRef = useRef(false);
  const sessionSegmentRef = useRef(1);
  const performHotSwapRef = useRef<(() => Promise<void>) | null>(null);
  // Refs for functions needed in callbacks (avoids circular dependencies)
  const stopRef = useRef<((options?: { resetStart?: boolean }) => void) | null>(null);
  const reconnectRef = useRef<((attempt?: number) => Promise<void>) | null>(null);

  // Hot swap timing configuration
  // TESTING: Set to 45 seconds for quick testing (change back to 54 * 60 * 1000 for production)
  const HOT_SWAP_INTERVAL_MS = 45 * 1000; // 45 seconds for testing
  // const HOT_SWAP_INTERVAL_MS = 54 * 60 * 1000; // 54 minutes for production

  const [state, setState] = useState<SonioxStreamState>({
    connected: false,
    error: null,
    reconnecting: false,
    reconnectAttempt: 0,
    reconnectMaxAttempts: 6,
    sessionSegment: 1,
    isHotSwapping: false
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

  // Cancel any pending hot swap timer
  const cancelHotSwap = useCallback(() => {
    if (hotSwapTimerRef.current) {
      clearTimeout(hotSwapTimerRef.current);
      hotSwapTimerRef.current = null;
    }
    isHotSwappingRef.current = false;
    setState((prev) => ({
      ...prev,
      isHotSwapping: false
    }));
  }, []);

  // Schedule the next hot swap
  const scheduleHotSwap = useCallback((delayMs: number = HOT_SWAP_INTERVAL_MS) => {
    // Clear any existing timer
    if (hotSwapTimerRef.current) {
      clearTimeout(hotSwapTimerRef.current);
    }

    const delaySeconds = Math.round(delayMs / 1000);
    console.log(`%c🔄 HOT SWAP SCHEDULED in ${delaySeconds} seconds`, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    hotSwapTimerRef.current = setTimeout(() => {
      // Only perform hot swap if we're still connected and not already reconnecting
      if (clientRef.current && !isReconnectingRef.current && !isHotSwappingRef.current) {
        // Use ref to call performHotSwap (avoids circular dependency)
        if (performHotSwapRef.current) {
          performHotSwapRef.current();
        }
      }
    }, delayMs);
  }, []);

  // Perform a seamless hot swap - new connection BEFORE killing old one
  const performHotSwap = useCallback(async () => {
    // Prevent concurrent hot swaps
    if (isHotSwappingRef.current || isReconnectingRef.current) {
      console.log("[useSonioxStream] Hot swap already in progress or reconnecting, skipping");
      return;
    }

    const stream = currentStreamRef.current;
    const actions = currentActionsRef.current;
    const oldClient = clientRef.current;

    if (!stream || !actions || !oldClient) {
      console.warn("[useSonioxStream] Cannot hot swap - missing stream, actions, or client");
      scheduleHotSwap(); // Try again later
      return;
    }

    console.log('%c🔥 HOT SWAP STARTING...', 'background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
    console.log('%c   Old client still running - transcript preserved!', 'color: #FF9800;');
    isHotSwappingRef.current = true;
    setState(prev => ({ ...prev, isHotSwapping: true }));

    try {
      // Step 1: Fetch fresh token WHILE old client is still running
      console.log('%c   ⏳ Step 1/4: Fetching fresh token...', 'color: #2196F3;');
      const tokenResponse = await fetch("/api/soniox/token", { method: "POST" });
      if (!tokenResponse.ok) {
        throw new Error(`Token fetch failed: ${tokenResponse.status}`);
      }
      const tokenData = await tokenResponse.json();

      if (!tokenData.apiKey) {
        throw new Error("Token response missing apiKey");
      }

      // Step 2: Create NEW Soniox client (old one still running!)
      console.log('%c   ⏳ Step 2/4: Creating new Soniox client...', 'color: #2196F3;');
      const SonioxClientCtor = await loadSonioxClient();

      // Create a promise that resolves when new client is ready
      const newClientReady = new Promise<SonioxClientInstance>((resolve, reject) => {
        const newClient = new SonioxClientCtor({
          apiKey: tokenData.apiKey,
          webSocketUri: tokenData.websocketUrl ?? undefined,
          onStarted: () => {
            console.log('%c   ✅ Step 3/4: New client connected!', 'color: #4CAF50; font-weight: bold;');
            resolve(newClient);
          },
          onPartialResult: (result: { tokens?: SonioxToken[] }) => {
            // Only process if this is now the active client
            if (clientRef.current === newClient) {
              try {
                processTokens(result?.tokens ?? [], actions);
              } catch (error) {
                console.warn("[useSonioxStream] Partial result error in hot-swapped client", error);
              }
            }
          },
          onFinished: () => {
            if (clientRef.current === newClient) {
              console.log("[useSonioxStream] Soniox finished after hot swap");
              actions.updateLive([...finalSegmentsRef.current], speakerMapRef.current.size);
              // Use ref to call stop (defined later in the code)
              if (stopRef.current) {
                stopRef.current({ resetStart: true });
              }
            }
          },
          onError: (status: string, message: string) => {
            // If this is during hot swap setup, reject the promise
            if (isHotSwappingRef.current && clientRef.current !== newClient) {
              reject(new Error(`New client error: ${message || status}`));
              return;
            }

            // If this is the active client, handle normally
            if (clientRef.current === newClient) {
              console.error("[useSonioxStream] Error in hot-swapped client", { status, message });

              if (isRecoverableError(status, message)) {
                isReconnectingRef.current = true;
                // Use ref to call reconnect (defined later in the code)
                if (reconnectRef.current) {
                  reconnectRef.current(1);
                }
              } else {
                const errorMessage = message || status || "Stream error";
                actions.fail(errorMessage);
                setState(prev => ({
                  ...prev,
                  connected: false,
                  error: errorMessage,
                  reconnecting: false,
                  reconnectAttempt: 0,
                  isHotSwapping: false
                }));
                // Use ref to call stop (defined later in the code)
                if (stopRef.current) {
                  stopRef.current({ resetStart: true });
                }
              }
            }
          }
        });

        // Start the new client with the same stream
        newClient.start({
          model: DEFAULT_MODEL,
          stream,
          enableSpeakerDiarization: true,
          enableLanguageIdentification: true,
          enableEndpointDetection: false,
          languageHints: ["en", "ar"],
        }).catch(reject);
      });

      // Step 3: Wait for new client to be fully ready
      const newClient = await newClientReady;

      // Step 4: ATOMIC SWAP - Kill old client immediately after new one is ready
      console.log('%c   ⚡ Step 4/4: ATOMIC SWAP - switching clients...', 'color: #9C27B0; font-weight: bold;');
      clientRef.current = newClient;

      // Terminate old client
      try {
        oldClient.cancel();
      } catch (err) {
        console.warn("[useSonioxStream] Error canceling old client during hot swap", err);
      }

      // Step 5: Update state - increment session segment
      sessionSegmentRef.current += 1;
      setState(prev => ({
        ...prev,
        sessionSegment: sessionSegmentRef.current,
        isHotSwapping: false
      }));
      isHotSwappingRef.current = false;

      console.log(`%c🎉 HOT SWAP COMPLETE! Session segment: ${sessionSegmentRef.current}`, 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;');
      console.log('%c   Transcript preserved ✓ | Audio stream continuous ✓ | Timer unchanged ✓', 'color: #4CAF50;');

      // Step 6: Schedule next hot swap
      scheduleHotSwap();

    } catch (error) {
      console.log('%c❌ HOT SWAP FAILED', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.error("   Error:", error);
      isHotSwappingRef.current = false;
      setState(prev => ({ ...prev, isHotSwapping: false }));

      // Old client should still be running - schedule retry in 1 minute
      console.log('%c   Old client still active - retrying in 60 seconds...', 'color: #FF9800;');
      scheduleHotSwap(60 * 1000); // Retry in 1 minute
    }
  }, [processTokens, scheduleHotSwap]);

  // Keep performHotSwap ref updated (needed for scheduleHotSwap to call it)
  performHotSwapRef.current = performHotSwap;

  const stop = useCallback((options?: { resetStart?: boolean }) => {
    // Cancel any pending reconnection
    cancelReconnect();

    // Cancel any pending hot swap
    cancelHotSwap();

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
      // Reset session segment counter for next recording
      sessionSegmentRef.current = 1;
    }
    setState((prev) => ({ ...prev, connected: false, sessionSegment: 1, isHotSwapping: false }));
  }, [cancelReconnect, cancelHotSwap]);

  // Keep stopRef updated (needed for performHotSwap callbacks)
  stopRef.current = stop;

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

          // Schedule next hot swap since we got a fresh token
          scheduleHotSwap();
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
  }, [processTokens, stop, state.reconnectMaxAttempts, scheduleHotSwap]);

  // Keep reconnectRef updated (needed for performHotSwap callbacks)
  reconnectRef.current = reconnect;

  const start = useCallback(
    async ({ apiKey, websocketUrl, stream, actions }: StartStreamParams) => {
      stop({ resetStart: true });
      setState({
        connected: false,
        error: null,
        reconnecting: false,
        reconnectAttempt: 0,
        reconnectMaxAttempts: 6,
        sessionSegment: 1,
        isHotSwapping: false
      });
      finalSegmentsRef.current = [];
      speakerMapRef.current = new Map();
      startedAtRef.current = Date.now();
      sessionSegmentRef.current = 1;

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

            // Schedule first hot swap for seamless unlimited recording
            scheduleHotSwap();
            console.log('%c🎙️ RECORDING STARTED - Unlimited duration enabled!', 'background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
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
    [processTokens, stop, reconnect, scheduleHotSwap],
  );

  const getTranscriptText = useCallback(() => {

    return finalSegmentsRef.current.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");

  }, []);

  const getSessionSegment = useCallback(() => sessionSegmentRef.current, []);



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
    performHotSwap,      // Expose for manual hot swap trigger
    getTranscriptText,
    getFinalSegments,
    getSpeakerCount,
    getStartTimestamp,
    getSessionSegment    // Get current session segment number
  };
}
