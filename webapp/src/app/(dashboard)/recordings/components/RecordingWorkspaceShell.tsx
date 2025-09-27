"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { saveSessionAction } from "@/app/actions/sessions";
import { useSelectedStudent } from "@/components/layout/SelectedStudentProvider";
import type { Session } from "@/lib/types";
import { useSessionList } from "./SessionListProvider";

import type { RecordingActions, RecordingResult } from "./RecordingConsole";
import { RecordingConsole } from "./RecordingConsole";
import { StudentPickerDialog } from "./StudentPickerDialog";
import { useAudioMixer } from "../hooks/useAudioMixer";
import { useSonioxToken } from "../hooks/useSonioxToken";
import { useSonioxStream } from "../hooks/useSonioxStream";

interface PendingStartRef {
  actions: RecordingActions;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

function buildTranscriptPreview(text: string, maxWords = 8): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function RecordingWorkspaceShell() {
  const { currentStudentId, currentStudentName } = useSelectedStudent();
  const { fetchToken, loading: tokenLoading, error: tokenError } = useSonioxToken();
  const mixer = useAudioMixer();
  const soniox = useSonioxStream();
  const router = useRouter();
  const { appendSession } = useSessionList();

  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);
  const [micGain, setMicGain] = useState(1);
  const [systemGain, setSystemGain] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const recordingActionsRef = useRef<RecordingActions | null>(null);
  const pendingStartRef = useRef<PendingStartRef | null>(null);

  const mixerError = useMemo(() => mixer.state.error, [mixer.state.error]);

  const startPipeline = useCallback(
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
        soniox.stop({ resetStart: true });
        mixer.stop();
        throw err;
      }
    },
    [fetchToken, mixer, soniox, includeSystemAudio, micGain, systemGain],
  );

  const handleStart = useCallback(
    async (actions: RecordingActions) => {
      setSaveError(null);
      setSaveSuccess(null);

      return new Promise<void>((resolve, reject) => {
        pendingStartRef.current = { actions, resolve, reject };
        setPickerOpen(true);
      });
    },
    [],
  );

  const resetActions = useCallback((actions?: RecordingActions) => {
    (actions ?? recordingActionsRef.current)?.reset();
  }, []);

  const handleStop = useCallback(
    async (actions: RecordingActions, result?: RecordingResult) => {
      setSavingSession(true);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        soniox.stop({ resetStart: false });
      } catch (error) {
        console.warn("Soniox stop error", error);
      }
      mixer.stop();

      const transcriptText = soniox.getTranscriptText ? soniox.getTranscriptText() : result?.transcript ?? "";
      const finalTranscript = transcriptText.trim();
      const startedAt = result?.startedAt ?? soniox.getStartTimestamp?.() ?? Date.now();
      const durationMs = result?.durationMs && result.durationMs > 0 ? result.durationMs : Math.max(0, Date.now() - startedAt);

      try {
        if (!currentStudentId) {
          throw new Error("Select a student before saving the session");
        }

        const saved = await saveSessionAction({
          transcript: finalTranscript,
          durationMs,
          studentId: currentStudentId,
          startedAt,
        });

        setSaveSuccess("Session saved. Generating summary and homework...");

        // Fire-and-forget: Start AI generation without blocking UI
        if (saved?.id) {
          const hasTranscript = finalTranscript.length > 0;
          const optimisticSession: Session = {
            id: saved.id,
            studentId: currentStudentId,
            studentName: currentStudentName ?? undefined,
            recordedAt: saved.timestamp,
            durationMs: saved.durationMs ?? durationMs,
            transcript: finalTranscript,
            transcriptPreview: buildTranscriptPreview(finalTranscript),
            generationStatus: hasTranscript ? "generating" : "empty",
            summaryReady: false,
            homeworkReady: false,
            summaryMd: null,
            homeworkMd: null,
            aiGenerationStatus: hasTranscript ? "generating" : "idle",
            aiGenerationStartedAt: hasTranscript ? new Date().toISOString() : null,
          };

          appendSession(optimisticSession);

          generateSessionArtifactsAction(saved.id).catch((error) => {
            console.error("AI generation error", error);
            // Don't show error to user since this is background generation
          });
        }

        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save session";
        setSaveError(message);
        throw error;
      } finally {
        resetActions(actions);
        setSavingSession(false);
      }
    },
    [appendSession, currentStudentId, currentStudentName, mixer, resetActions, router, soniox],
  );

  const handleCancel = useCallback(
    async (actions: RecordingActions) => {
      try {
        soniox.stop({ resetStart: true });
      } catch (error) {
        console.warn("Soniox cancel error", error);
      }
      mixer.stop();
      resetActions(actions);
      setSaveError(null);
      setSaveSuccess(null);
    },
    [mixer, resetActions, soniox],
  );

  const handleStudentConfirmed = useCallback(
    async (student: { id: string; name: string }) => {
      void student;
      const pending = pendingStartRef.current;
      if (!pending) {
        setPickerOpen(false);
        return;
      }

      try {
        await startPipeline(pending.actions);
        pending.resolve();
        setSaveError(null);
        setSaveSuccess(null);
      } catch (err) {
        pending.reject(err);
      } finally {
        pendingStartRef.current = null;
        setPickerOpen(false);
      }
    },
    [startPipeline],
  );

  const handlePickerDismiss = useCallback((reason?: "cancel" | "outside") => {
    setPickerOpen(false);
    if (pendingStartRef.current) {
      pendingStartRef.current.reject(
        new Error(reason === "cancel" ? "Student selection cancelled" : "Student selection dismissed"),
      );
      pendingStartRef.current = null;
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs">
        <div className="text-slate-400">
          Current student: <span className="font-semibold text-slate-200">{currentStudentName ?? "Not selected"}</span>
        </div>
        <button
          type="button"
          className="rounded-xl border border-slate-700 px-3 py-1 text-slate-100 transition hover:border-slate-500"
          onClick={() => setPickerOpen(true)}
        >
          {currentStudentId ? "Change" : "Choose student"}
        </button>
      </div>

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
      {saveError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {saveError}
        </p>
      ) : null}
      {saveSuccess ? (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          {saveSuccess}
        </p>
      ) : null}

      <RecordingConsole onStart={handleStart} onStop={handleStop} onCancel={handleCancel} />

      {(tokenLoading || mixer.state.requesting || savingSession) && (
        <p className="text-xs text-slate-500">
          {savingSession ? "Saving session to Supabase..." : "Preparing recording pipeline..."}
        </p>
      )}

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

      <StudentPickerDialog open={pickerOpen} onDismiss={handlePickerDismiss} onStudentConfirmed={handleStudentConfirmed} />
    </div>
  );
}

