"use client";

import { useState, useCallback, useRef } from "react";
import { RecordingConsole, RecordingActions, RecordingResult } from "@/app/(dashboard)/recordings/components/RecordingConsole";
import { useSonioxStream } from "@/app/(dashboard)/recordings/hooks/useSonioxStream";
import { useAudioMixer } from "@/app/(dashboard)/recordings/hooks/useAudioMixer";
import { DemoResults } from "./DemoResults";

const MAX_RECORDING_TIME_MS = 3 * 60 * 1000; // 3 minutes

interface DemoRecordingWorkspaceProps {
  remaining: number;
  onComplete: () => void;
}

export function DemoRecordingWorkspace({ remaining, onComplete }: DemoRecordingWorkspaceProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sonioxStream = useSonioxStream();
  const { requestStream, stopAllStreams } = useAudioMixer();

  const recordingStartTimeRef = useRef<number>(0);
  const maxTimeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionsRef = useRef<RecordingActions | null>(null);

  const handleStart = useCallback(
    async (actions: RecordingActions) => {
      actionsRef.current = actions;

      try {
        // Get audio stream
        const stream = await requestStream();

        // Get Soniox token
        const tokenResponse = await fetch("/api/soniox/token");
        if (!tokenResponse.ok) {
          throw new Error("Failed to get transcription token");
        }

        const { apiKey, websocketUrl } = await tokenResponse.json();

        actions.setConnecting();

        // Start Soniox stream
        await sonioxStream.start({
          apiKey,
          websocketUrl,
          stream,
          actions,
        });

        recordingStartTimeRef.current = Date.now();

        // Set 3-minute auto-stop timer
        maxTimeTimerRef.current = setTimeout(() => {
          if (actionsRef.current) {
            // Auto-stop when reaching 3 minutes
            sonioxStream.stop();
            stopAllStreams();
          }
        }, MAX_RECORDING_TIME_MS);

      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start recording";
        throw new Error(message);
      }
    },
    [requestStream, sonioxStream, stopAllStreams]
  );

  const handleStop = useCallback(
    async (actions: RecordingActions, result: RecordingResult) => {
      // Clear the auto-stop timer
      if (maxTimeTimerRef.current) {
        clearTimeout(maxTimeTimerRef.current);
        maxTimeTimerRef.current = null;
      }

      sonioxStream.stop();
      stopAllStreams();

      setIsProcessing(true);
      setTranscript(result.transcript);

      try {
        // Generate summary
        const response = await fetch("/api/demo/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: result.transcript }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate summary");
        }

        const data = await response.json();
        setSummary(data.summary);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate summary";
        setError(message);
        actions.fail(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [sonioxStream, stopAllStreams]
  );

  const handleCancel = useCallback(() => {
    // Clear the auto-stop timer
    if (maxTimeTimerRef.current) {
      clearTimeout(maxTimeTimerRef.current);
      maxTimeTimerRef.current = null;
    }

    sonioxStream.stop();
    stopAllStreams();
  }, [sonioxStream, stopAllStreams]);

  const handleReset = useCallback(() => {
    setSummary(null);
    setTranscript(null);
    setError(null);
    setIsProcessing(false);
    onComplete();
  }, [onComplete]);

  // Show results if we have transcript and summary
  if (transcript && summary && !isProcessing) {
    return (
      <DemoResults
        transcript={transcript}
        summary={summary}
        remaining={remaining}
        onReset={handleReset}
      />
    );
  }

  // Show processing state
  if (isProcessing) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-8 shadow-lg text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="w-12 h-12 animate-spin text-sky-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Generating AI Summary...
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            This will just take a moment
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 shadow-lg text-center">
          <p className="text-red-900 dark:text-red-100 font-medium mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show recording console
  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Try Free Demo - Real-Time Transcription
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Record up to 3 minutes • Watch your words appear in real-time • Get instant AI summary
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          {remaining} {remaining === 1 ? "trial" : "trials"} remaining today
        </p>
      </div>

      <RecordingConsole
        onStart={handleStart}
        onStop={handleStop}
        onCancel={handleCancel}
        title="Demo Recording"
        subtitle="See real-time transcription powered by Soniox AI - just like the full version!"
      />

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Recording will automatically stop at 3 minutes
        </p>
      </div>
    </div>
  );
}
