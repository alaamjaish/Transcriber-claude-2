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

export function useSonioxStream() {
  const clientRef = useRef<SonioxClientInstance | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const finalSegmentsRef = useRef<TranscriptSegment[]>([]);
  const speakerMapRef = useRef<Map<string, string>>(new Map());

  const [state, setState] = useState<SonioxStreamState>({ connected: false, error: null });

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

  const stop = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.stop();
      } catch (error) {
        console.warn("Soniox stop error", error);
      }
      clientRef.current = null;
    }
    startedAtRef.current = null;
    setState((prev) => ({ ...prev, connected: false }));
  }, []);

  const start = useCallback(
    async ({ apiKey, websocketUrl, stream, actions }: StartStreamParams) => {
      stop();
      setState({ connected: false, error: null });
      finalSegmentsRef.current = [];
      speakerMapRef.current = new Map();
      startedAtRef.current = Date.now();

      try {
        const SonioxClientCtor = await loadSonioxClient();
        const client = new SonioxClientCtor({
          apiKey,
          webSocketUri: websocketUrl ?? undefined,
          onStarted: () => {
            setState({ connected: true, error: null });
            actions.setLive(startedAtRef.current ?? Date.now());
          },
          onPartialResult: (result: { tokens?: SonioxToken[] }) => {
            try {
              processTokens(result?.tokens ?? [], actions);
            } catch (error) {
              console.warn("Soniox partial error", error);
            }
          },
          onFinished: () => {
            // When finished, show complete final transcript in live view (no partials left)
            actions.updateLive([...finalSegmentsRef.current], speakerMapRef.current.size);
            stop();
          },
          onError: (status: string, message: string) => {
            const errorMessage = message || status || "Stream error";
            actions.fail(errorMessage);
            setState({ connected: false, error: errorMessage });
            stop();
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
        setState({ connected: false, error: message });
        stop();
        throw error;
      }
    },
    [processTokens, stop],
  );

  return { state, start, stop };
}
