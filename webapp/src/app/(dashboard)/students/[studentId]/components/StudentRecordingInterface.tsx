"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { saveSessionAction } from "@/app/actions/sessions";
import type { Session, Student } from "@/lib/types";
import { useSessionList } from "@/app/(dashboard)/recordings/components/SessionListProvider";

import type { RecordingActions, RecordingResult } from "@/app/(dashboard)/recordings/components/RecordingConsole";
import { RecordingConsole } from "@/app/(dashboard)/recordings/components/RecordingConsole";
import { SystemAudioToggle } from "@/app/(dashboard)/recordings/components/SystemAudioToggle";
import { useAudioMixer } from "@/app/(dashboard)/recordings/hooks/useAudioMixer";
import { useSonioxToken } from "@/app/(dashboard)/recordings/hooks/useSonioxToken";
import { useSonioxStream } from "@/app/(dashboard)/recordings/hooks/useSonioxStream";
import { useLocalBackup } from "@/app/(dashboard)/recordings/hooks/useLocalBackup";
import { useNetworkMonitor } from "@/app/(dashboard)/recordings/hooks/useNetworkMonitor";
import { useUploadQueue } from "@/app/(dashboard)/recordings/hooks/useUploadQueue";

function buildTranscriptPreview(text: string, maxWords = 8): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

interface StudentRecordingInterfaceProps {
  student: Student;
  onEditName?: () => void;
}

export function StudentRecordingInterface({ student, onEditName }: StudentRecordingInterfaceProps) {
  const { fetchToken, loading: tokenLoading, error: tokenError } = useSonioxToken();
  const mixer = useAudioMixer();
  const soniox = useSonioxStream();
  const router = useRouter();
  const { appendSession } = useSessionList();
  const backup = useLocalBackup();
  const { isOnline, justWentOnline } = useNetworkMonitor();
  const { processQueue, queueCount } = useUploadQueue();

  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [enableSystemAudio, setEnableSystemAudio] = useState(false);

  const recordingActionsRef = useRef<RecordingActions | null>(null);
  const isRecordingRef = useRef(false);
  const recoveryAttemptedRef = useRef(false);

  const mixerError = useMemo(() => mixer.state.error, [mixer.state.error]);

  useEffect(() => {
    if (recoveryAttemptedRef.current) {
      return;
    }

    const draft = backup.loadDraft();
    if (!draft || draft.studentId !== student.id) {
      return;
    }

    recoveryAttemptedRef.current = true;
    setSavingSession(true);
    setSaveError(null);
    setSaveSuccess(null);

    const recover = async () => {
      try {
        const saved = await saveSessionAction({
          transcript: draft.transcript,
          durationMs: draft.durationMs,
          studentId: draft.studentId,
          startedAt: draft.startedAt,
        });

        backup.clearDraft();
        setSaveSuccess("Recovered recording saved successfully.");

        const hasTranscript = draft.transcript.trim().length > 0;
        const optimisticSession: Session = {
          id: saved.id,
          studentId: draft.studentId,
          studentName: draft.studentName,
          recordedAt: saved.timestamp,
          durationMs: saved.durationMs ?? draft.durationMs,
          transcript: draft.transcript,
          transcriptPreview: buildTranscriptPreview(draft.transcript),
          generationStatus: hasTranscript ? "generating" : "empty",
          summaryReady: false,
          homeworkReady: false,
          summaryMd: null,
          homeworkMd: null,
          aiGenerationStatus: hasTranscript ? "generating" : "idle",
          aiGenerationStartedAt: hasTranscript ? new Date().toISOString() : null,
        };

        appendSession(optimisticSession);

        if (hasTranscript) {
          generateSessionArtifactsAction(saved.id).catch((error) => {
            console.error("AI generation error", error);
          });
        }

        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to recover recording";
        setSaveError(`${message} - saved locally and will retry when online`);
        backup.addToQueue({
          studentId: draft.studentId,
          studentName: draft.studentName,
          transcript: draft.transcript,
          startedAt: draft.startedAt,
          durationMs: draft.durationMs,
        });
      } finally {
        setSavingSession(false);
      }
    };

    void recover();
  }, [appendSession, backup, router, student.id, student.name]);

  useEffect(() => {
    if ((justWentOnline || isOnline) && queueCount > 0) {
      processQueue();
    }
  }, [isOnline, justWentOnline, processQueue, queueCount]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isRecordingRef.current) {
        return;
      }

      const transcriptText = soniox.getTranscriptText ? soniox.getTranscriptText() : "";
      if (transcriptText.trim()) {
        backup.saveDraft({
          studentId: student.id,
          studentName: student.name,
          transcript: transcriptText,
          startedAt: soniox.getStartTimestamp?.() ?? Date.now(),
          durationMs: Date.now() - (soniox.getStartTimestamp?.() ?? Date.now()),
          speakerCount: soniox.getSpeakerCount ? soniox.getSpeakerCount() : 0,
          status: "recording",
          lastSaved: Date.now(),
        });
      }

      event.preventDefault();
      event.returnValue = "You have an active recording. Your progress has been saved and will restore on reload.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [backup, soniox, student.id, student.name]);

  const startPipeline = useCallback(
    async (actions: RecordingActions) => {
      recordingActionsRef.current = actions;

      actions.reset();

      try {
        actions.setConnecting();
        const token = await fetchToken();
        if (!token?.apiKey) {
          throw new Error("Unable to obtain Soniox API key");
        }

        const stream = await mixer.start({
          includeSystemAudio: enableSystemAudio,
          micGain: 1,
          systemGain: 1,
        });

        const startTime = Date.now();
        actions.setLive(startTime);
        isRecordingRef.current = true;

        await soniox.start({
          apiKey: token.apiKey,
          websocketUrl: token.websocketUrl ?? undefined,
          stream,
          actions,
        });

        backup.startAutoSave(() => ({
          studentId: student.id,
          studentName: student.name,
          transcript: soniox.getTranscriptText ? soniox.getTranscriptText() : "",
          startedAt: soniox.getStartTimestamp?.() ?? startTime,
          durationMs: Date.now() - (soniox.getStartTimestamp?.() ?? startTime),
          speakerCount: soniox.getSpeakerCount ? soniox.getSpeakerCount() : 0,
          status: "recording",
          lastSaved: Date.now(),
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start recording";
        actions.fail(message);
        soniox.stop({ resetStart: true });
        mixer.stop();
        backup.stopAutoSave();
        isRecordingRef.current = false;
        throw error;
      }
    },
    [backup, enableSystemAudio, fetchToken, mixer, soniox, student.id, student.name],
  );

  const handleStart = useCallback(
    async (actions: RecordingActions) => {
      setSaveError(null);
      setSaveSuccess(null);

      try {
        await startPipeline(actions);
      } catch (error) {
        console.error("Recording start error", error);
      }
    },
    [startPipeline],
  );

  const resetActions = useCallback((actions?: RecordingActions) => {
    (actions ?? recordingActionsRef.current)?.reset();
  }, []);

  const handleStop = useCallback(
    async (actions: RecordingActions, result?: RecordingResult) => {
      isRecordingRef.current = false;
      setSavingSession(true);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        soniox.stop({ resetStart: false });
      } catch (error) {
        console.warn("Soniox stop error", error);
      }
      mixer.stop();
      backup.stopAutoSave();

      const transcriptText = soniox.getTranscriptText ? soniox.getTranscriptText() : result?.transcript ?? "";
      const finalTranscript = transcriptText.trim();
      const startedAt = result?.startedAt ?? soniox.getStartTimestamp?.() ?? Date.now();
      const durationMs = result?.durationMs && result.durationMs > 0 ? result.durationMs : Math.max(0, Date.now() - startedAt);

      try {
        const saved = await saveSessionAction({
          transcript: finalTranscript,
          durationMs,
          studentId: student.id,
          startedAt,
        });

        backup.clearDraft();
        setSaveSuccess("Session saved. Generating summary and homework...");

        if (saved?.id) {
          const hasTranscript = finalTranscript.length > 0;
          const optimisticSession: Session = {
            id: saved.id,
            studentId: student.id,
            studentName: student.name,
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
          });
        }

        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save session";
        console.error("Save error", error);

        backup.addToQueue({
          studentId: student.id,
          studentName: student.name,
          transcript: finalTranscript,
          startedAt,
          durationMs,
        });

        setSaveError(`${message} - saved locally and will retry when online`);
      } finally {
        setSavingSession(false);
      }
    },
    [appendSession, backup, mixer, router, soniox, student.id, student.name],
  );

  const handleCancel = useCallback(
    async (actions: RecordingActions) => {
      isRecordingRef.current = false;
      try {
        soniox.stop({ resetStart: true });
      } catch (error) {
        console.warn("Soniox cancel error", error);
      }
      mixer.stop();
      backup.stopAutoSave();
      resetActions(actions);
      setSaveError(null);
      setSaveSuccess(null);
    },
    [backup, mixer, resetActions, soniox],
  );

  return (
    <div className="space-y-3">
      {!isOnline && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">No internet connection</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Recordings are saved locally and will upload automatically when the connection returns.
                {queueCount > 0 && ` (${queueCount} recording${queueCount > 1 ? "s" : ""} waiting to upload)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {justWentOnline && queueCount > 0 && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Connection restored. Uploading {queueCount} queued recording{queueCount > 1 ? "s" : ""}...
        </div>
      )}

      <SystemAudioToggle
        enabled={enableSystemAudio}
        onChange={setEnableSystemAudio}
        disabled={mixer.state.requesting || soniox.state.status === "live"}
      />

      {tokenError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-600 dark:text-rose-200">
          Token error: {tokenError}
        </p>
      ) : null}
      {mixerError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-600 dark:text-rose-200">
          Audio error: {mixerError}
        </p>
      ) : null}
      {soniox.state.error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-600 dark:text-rose-200">
          Stream error: {soniox.state.error}
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-600 dark:text-rose-200">
          {saveError}
        </p>
      ) : null}
      {saveSuccess ? (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-200">
          {saveSuccess}
        </p>
      ) : null}

      <RecordingConsole
        title={`${student.name}'s Recording Console`}
        subtitle="Monitor live transcription and manage session capture."
        onStart={handleStart}
        onStop={handleStop}
        onCancel={handleCancel}
        onEditName={onEditName}
      />

      {(tokenLoading || mixer.state.requesting || savingSession) && (
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {savingSession ? "Saving session to Supabase..." : "Preparing recording pipeline..."}
        </p>
      )}
    </div>
  );
}
