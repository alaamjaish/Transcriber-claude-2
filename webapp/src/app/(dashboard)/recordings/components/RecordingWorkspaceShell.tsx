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
import { SystemAudioToggle } from "./SystemAudioToggle";
import { useAudioMixer } from "../hooks/useAudioMixer";
import { useSonioxToken } from "../hooks/useSonioxToken";
import { useSonioxStream } from "../hooks/useSonioxStream";
import { useLocalBackup } from "../hooks/useLocalBackup";
import { useNetworkMonitor } from "../hooks/useNetworkMonitor";
import { useUploadQueue } from "../hooks/useUploadQueue";

interface PendingStartRef {
  actions: RecordingActions;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

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

export function RecordingWorkspaceShell() {
  const { currentStudentId, currentStudentName, setCurrentStudent } = useSelectedStudent();
  const { fetchToken, loading: tokenLoading, error: tokenError } = useSonioxToken();
  const mixer = useAudioMixer();
  const soniox = useSonioxStream();
  const router = useRouter();
  const { appendSession } = useSessionList();
  const backup = useLocalBackup();
  const { isOnline, justWentOnline } = useNetworkMonitor();
  const { processQueue, queueCount } = useUploadQueue();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [enableSystemAudio, setEnableSystemAudio] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const recordingActionsRef = useRef<RecordingActions | null>(null);
  const pendingStartRef = useRef<PendingStartRef | null>(null);
  const selectedStudentRef = useRef<{ id: string; name: string } | null>(null);
  const isRecordingRef = useRef(false);
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    let active = true;
    setStudentsLoading(true);
    setStudentsError(null);

    listStudentsAction()
      .then((result) => {
        if (!active) {
          return;
        }
        setStudents(result);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load students";
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

        const activeStudent = selectedStudentRef.current ?? (currentStudentId
          ? { id: currentStudentId, name: currentStudentName ?? "" }
          : null);

        if (activeStudent) {
          backup.startAutoSave(() => ({
            studentId: activeStudent.id,
            studentName: activeStudent.name,
            transcript: soniox.getTranscriptText ? soniox.getTranscriptText() : "",
            startedAt: soniox.getStartTimestamp?.() ?? startTime,
            durationMs: Date.now() - (soniox.getStartTimestamp?.() ?? startTime),
            speakerCount: soniox.getSpeakerCount ? soniox.getSpeakerCount() : 0,
            status: "recording",
            lastSaved: Date.now(),
          }));
        }
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
    [backup, currentStudentId, currentStudentName, enableSystemAudio, fetchToken, mixer, soniox],
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

      const activeStudent = currentStudentId
        ? { id: currentStudentId, name: currentStudentName ?? "" }
        : selectedStudentRef.current;

      try {
        if (!activeStudent?.id) {
          throw new Error("Select a student before saving the session");
        }

        const saved = await saveSessionAction({
          transcript: finalTranscript,
          durationMs,
          studentId: activeStudent.id,
          startedAt,
        });

        backup.clearDraft();
        setSaveSuccess("Session saved. Generating summary and homework...");

        if (saved?.id) {
          const hasTranscript = finalTranscript.length > 0;
          const optimisticSession: Session = {
            id: saved.id,
            studentId: activeStudent.id,
            studentName: activeStudent.name || undefined,
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
        setSaveError(message);

        if (activeStudent?.id) {
          backup.addToQueue({
            studentId: activeStudent.id,
            studentName: activeStudent.name,
            transcript: finalTranscript,
            startedAt,
            durationMs,
          });
          setSaveError(`${message} - saved locally and will retry when online`);
        }
      } finally {
        selectedStudentRef.current = null;
        setSavingSession(false);
      }
    },
    [appendSession, backup, currentStudentId, currentStudentName, mixer, router, soniox],
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
      backup.clearDraft(); // Clear local backup - don't save on cancel!
      selectedStudentRef.current = null;
      resetActions(actions);
      setSaveError(null);
      setSaveSuccess(null);
    },
    [backup, mixer, resetActions, soniox],
  );

  const handleStudentConfirmed = useCallback(
    async (student: { id: string; name: string }) => {
      const pending = pendingStartRef.current;
      if (!pending) {
        setPickerOpen(false);
        return;
      }

      selectedStudentRef.current = student;
      setPickerOpen(false);
      setSaveError(null);
      setSaveSuccess(null);

      try {
        await startPipeline(pending.actions);
        pending.resolve();
      } catch (error) {
        pending.reject(error);
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

  useEffect(() => {
    if (recoveryAttemptedRef.current) {
      return;
    }
    const draft = backup.loadDraft();
    if (!draft || !draft.studentId) {
      return;
    }

    recoveryAttemptedRef.current = true;
    setSavingSession(true);
    setSaveError(null);
    setSaveSuccess(null);

    const recover = async () => {
      try {
        selectedStudentRef.current = { id: draft.studentId, name: draft.studentName };
        await setCurrentStudent({ id: draft.studentId, name: draft.studentName });

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
  }, [appendSession, backup, router, setCurrentStudent]);

  useEffect(() => {
    if ((justWentOnline || isOnline) && queueCount > 0) {
      processQueue();
    }
  }, [isOnline, justWentOnline, processQueue, queueCount]);

  // Proactive reconnection when network returns
  useEffect(() => {
    // Only trigger if:
    // 1. Network just came back online
    // 2. Recording is active
    // 3. Soniox is NOT connected
    // 4. Soniox is NOT already reconnecting
    if (
      justWentOnline &&
      isRecordingRef.current &&
      !soniox.state.connected &&
      !soniox.state.reconnecting
    ) {
      console.log("[RecordingWorkspace] Network returned - triggering immediate reconnection");

      // Trigger immediate reconnection (bypasses exponential backoff delay)
      // This is the magic: network is back, don't wait, reconnect NOW
      if (soniox.reconnect) {
        soniox.reconnect(1);  // Start from attempt 1
      }
    }
  }, [justWentOnline, soniox]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isRecordingRef.current) {
        return;
      }

      const transcriptText = soniox.getTranscriptText ? soniox.getTranscriptText() : "";
      const activeStudent = currentStudentId
        ? { id: currentStudentId, name: currentStudentName ?? "" }
        : selectedStudentRef.current;

      if (transcriptText.trim() && activeStudent) {
        backup.saveDraft({
          studentId: activeStudent.id,
          studentName: activeStudent.name,
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
  }, [backup, currentStudentId, currentStudentName, soniox]);

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
        disabled={mixer.state.requesting || soniox.state.connected}
      />

      {tokenError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">Token error: {tokenError}</p>
      ) : null}
      {mixerError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">Audio error: {mixerError}</p>
      ) : null}
      {soniox.state.reconnecting && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Connection lost - {soniox.state.error || `Attempt ${soniox.state.reconnectAttempt}/${soniox.state.reconnectMaxAttempts}`}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Your recording is safe. Transcript is being saved locally while we reconnect.
              </p>
            </div>
          </div>
        </div>
      )}
      {soniox.state.error && !soniox.state.reconnecting ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">Stream error: {soniox.state.error}</p>
      ) : null}
      {studentsError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{studentsError}</p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{saveError}</p>
      ) : null}
      {saveSuccess ? (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">{saveSuccess}</p>
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





