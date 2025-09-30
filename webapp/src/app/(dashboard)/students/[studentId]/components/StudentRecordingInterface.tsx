"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { saveSessionAction } from "@/app/actions/sessions";
import type { Session, Student } from "@/lib/types";
import { useSessionList } from "@/app/(dashboard)/recordings/components/SessionListProvider";

import type { RecordingActions, RecordingResult } from "@/app/(dashboard)/recordings/components/RecordingConsole";
import { RecordingConsole } from "@/app/(dashboard)/recordings/components/RecordingConsole";
import { useAudioMixer } from "@/app/(dashboard)/recordings/hooks/useAudioMixer";
import { useSonioxToken } from "@/app/(dashboard)/recordings/hooks/useSonioxToken";
import { useSonioxStream } from "@/app/(dashboard)/recordings/hooks/useSonioxStream";

function buildTranscriptPreview(text: string, maxWords = 8): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

interface StudentRecordingInterfaceProps {
  student: Student;
}

export function StudentRecordingInterface({ student }: StudentRecordingInterfaceProps) {
  const { fetchToken, loading: tokenLoading, error: tokenError } = useSonioxToken();
  const mixer = useAudioMixer();
  const soniox = useSonioxStream();
  const router = useRouter();
  const { appendSession } = useSessionList();

  const [savingSession, setSavingSession] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const recordingActionsRef = useRef<RecordingActions | null>(null);

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

      // Since we're in a student context, automatically start recording without student selection
      try {
        await startPipeline(actions);
      } catch (err) {
        console.error("Recording start error:", err);
      }
    },
    [startPipeline],
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
        // Automatically use the current student ID
        const saved = await saveSessionAction({
          transcript: finalTranscript,
          durationMs,
          studentId: student.id,
          startedAt,
        });

        setSaveSuccess("Session saved. Generating summary and homework...");

        // Fire-and-forget: Start AI generation without blocking UI
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
    [appendSession, student.id, student.name, mixer, router, soniox],
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

  return (
    <div className="space-y-3">

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
        title={`${student.name} Recording Console`}
        subtitle="Monitor live transcription and manage session capture."
        onStart={handleStart}
        onStop={handleStop}
        onCancel={handleCancel}
      />

      {(tokenLoading || mixer.state.requesting || savingSession) && (
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {savingSession ? "Saving session to Supabase..." : "Preparing recording pipeline..."}
        </p>
      )}
    </div>
  );
}
