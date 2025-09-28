"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { saveSessionAction } from "@/app/actions/sessions";
import { listStudentsAction } from "@/app/actions/students";
import { useSelectedStudent } from "@/components/layout/SelectedStudentProvider";
import type { Session, Student } from "@/lib/types";
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

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Preloaded students state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const recordingActionsRef = useRef<RecordingActions | null>(null);
  const pendingStartRef = useRef<PendingStartRef | null>(null);

  // Preload students on component mount
  useEffect(() => {
    let active = true;
    setStudentsLoading(true);
    setStudentsError(null);

    listStudentsAction()
      .then((result) => {
        if (!active) return;
        setStudents(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Failed to load students";
        setStudentsError(message);
      })
      .finally(() => {
        if (active) {
          setStudentsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const mixerError = useMemo(() => mixer.state.error, [mixer.state.error]);

  const startPipeline = useCallback(
    async (actions: RecordingActions) => {
      recordingActionsRef.current = actions;

      // Reset previous transcript when starting new recording
      actions.reset();

      try {
        actions.setConnecting();
        const token = await fetchToken();
        if (!token?.apiKey) {
          throw new Error("Unable to obtain Soniox API key");
        }

        const stream = await mixer.start({
          includeSystemAudio: false,
          micGain: 1,
          systemGain: 1,
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
    [fetchToken, mixer, soniox],
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
        setSavingSession(false);
      }
    },
    [appendSession, currentStudentId, currentStudentName, mixer, router, soniox],
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

      // Close dialog immediately to show status indicators
      setPickerOpen(false);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        await startPipeline(pending.actions);
        pending.resolve();
      } catch (err) {
        pending.reject(err);
      } finally {
        pendingStartRef.current = null;
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


      <StudentPickerDialog
        open={pickerOpen}
        onDismiss={handlePickerDismiss}
        onStudentConfirmed={handleStudentConfirmed}
        students={students}
        loading={studentsLoading}
        error={studentsError}
      />
    </div>
  );
}

