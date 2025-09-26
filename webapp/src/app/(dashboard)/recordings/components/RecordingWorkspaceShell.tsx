"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { RecordingActions } from "./RecordingConsole";
import { RecordingConsole } from "./RecordingConsole";
import { useAudioMixer } from "../hooks/useAudioMixer";
import { useSonioxToken } from "../hooks/useSonioxToken";
import { useSonioxStream } from "../hooks/useSonioxStream";

export function RecordingWorkspaceShell() {
  const { fetchToken, loading: tokenLoading, error: tokenError } = useSonioxToken();
  const mixer = useAudioMixer();
  const soniox = useSonioxStream();
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);
  const [micGain, setMicGain] = useState(1);
  const [systemGain, setSystemGain] = useState(1);
  const recordingActionsRef = useRef<RecordingActions | null>(null);

  const mixerError = useMemo(() => mixer.state.error, [mixer.state.error]);

  const handleStart = useCallback(
    async (actions: RecordingActions) => {
      recordingActionsRef.current = actions;
      try {
        actions.setConnecting();
        const token = await fetchToken();
        if (!token?.apiKey) {
          throw new Error("Unable to obtain Soniox API key");
        }

        const stream = await mixer.start({
          includeSystemAudio,
          micGain,
          systemGain,
        });

        actions.setLive(Date.now());

        await soniox.start({
          apiKey: token.apiKey,
          websocketUrl: token.websocketUrl ?? undefined,
          stream,
          actions,
        });
      } catch (err) {
        const message = (err as Error).message || "Failed to start recording";
        actions.fail(message);
        soniox.stop();
        mixer.stop();
        throw err;
      }
    },
    [fetchToken, mixer, soniox, includeSystemAudio, micGain, systemGain],
  );

  const cleanupRecording = useCallback((actions?: RecordingActions) => {
    soniox.stop();
    mixer.stop();
    (actions ?? recordingActionsRef.current)?.reset();
  }, [soniox, mixer]);

  const handleStop = useCallback(async (actions: RecordingActions) => {
    cleanupRecording(actions);
  }, [cleanupRecording]);

  const handleCancel = useCallback(async (actions: RecordingActions) => {
    cleanupRecording(actions);
  }, [cleanupRecording]);

  return (
    <div className="space-y-3">
      {tokenError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          Token error: {tokenError}
        </p>
      ) : null}
      {mixerError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          Audio error: {mixerError}
        </p>
      ) : null}
      {soniox.state.error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          Stream error: {soniox.state.error}
        </p>
      ) : null}
      <RecordingConsole
        onStart={handleStart}
        onStop={handleStop}
        onCancel={handleCancel}
      />
      {tokenLoading || mixer.state.requesting ? (
        <p className="text-xs text-slate-500">Preparing recording pipeline…</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            checked={includeSystemAudio}
            onChange={(event) => setIncludeSystemAudio(event.target.checked)}
          />
          Capture system audio
        </label>
        <label className="flex items-center gap-2">
          Mic gain
          <input
            type="range"
            className="h-1 w-32"
            min="0"
            max="3"
            step="0.1"
            value={micGain}
            onChange={(event) => {
              const value = Number(event.target.value);
              setMicGain(value);
              mixer.setMicGain(value);
            }}
          />
          <span className="text-slate-300">{micGain.toFixed(1)}x</span>
        </label>
        <label className="flex items-center gap-2">
          System gain
          <input
            type="range"
            className="h-1 w-32"
            min="0"
            max="3"
            step="0.1"
            value={systemGain}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSystemGain(value);
              mixer.setSystemGain(value);
            }}
          />
          <span className="text-slate-300">{systemGain.toFixed(1)}x</span>
        </label>
      </div>
    </div>
  );
}

