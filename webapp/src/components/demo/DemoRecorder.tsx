"use client";

import { useState, useRef, useEffect } from "react";
import { DemoResults } from "./DemoResults";

const MAX_RECORDING_TIME_MS = 3 * 60 * 1000; // 3 minutes in milliseconds

type RecordingState = "idle" | "recording" | "processing" | "completed" | "error";

interface DemoResult {
  transcript: string;
  summary: string;
  remaining: number;
}

interface RateLimitError {
  message: string;
  resetDate: string;
}

export function DemoRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getRemainingTime = (): string => {
    const remaining = MAX_RECORDING_TIME_MS - elapsedTime;
    return formatTime(remaining);
  };

  const startRecording = async () => {
    try {
      setError(null);
      setRateLimitError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        processRecording();
      };

      mediaRecorder.start();
      setState("recording");
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedTime(elapsed);

        // Auto-stop at max time
        if (elapsed >= MAX_RECORDING_TIME_MS) {
          stopRecording();
        }
      }, 100);

    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to access microphone. Please check your permissions.");
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processRecording = async () => {
    setState("processing");

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Check if recording is too short (less than 1 second)
      const durationSeconds = elapsedTime / 1000;
      if (durationSeconds < 1) {
        setError("Recording is too short. Please record at least 1 second of audio.");
        setState("error");
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/demo/process", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "RATE_LIMIT_EXCEEDED") {
          setRateLimitError({
            message: data.message,
            resetDate: data.resetDate,
          });
          setState("error");
          return;
        }

        setError(data.message || "Failed to process recording. Please try again.");
        setState("error");
        return;
      }

      setResult({
        transcript: data.transcript,
        summary: data.summary,
        remaining: data.remaining,
      });
      setState("completed");

    } catch (err) {
      console.error("Processing error:", err);
      setError("An unexpected error occurred. Please try again.");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setElapsedTime(0);
    setResult(null);
    setError(null);
    setRateLimitError(null);
    audioChunksRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (state === "completed" && result) {
    return (
      <DemoResults
        transcript={result.transcript}
        summary={result.summary}
        remaining={result.remaining}
        onReset={reset}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-8 shadow-lg">
        <div className="text-center space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Try Free Demo
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Record up to 3 minutes of audio • Get instant AI summary • No signup required
            </p>
          </div>

          {/* Recording State */}
          {state === "recording" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-red-500 dark:bg-red-600"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-mono text-slate-900 dark:text-slate-100">
                  {formatTime(elapsedTime)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Remaining: {getRemainingTime()}
                </p>
              </div>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Stop Recording
              </button>
            </div>
          )}

          {/* Processing State */}
          {state === "processing" && (
            <div className="space-y-4">
              <div className="flex justify-center">
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
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Processing your recording...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Transcribing and generating summary
                </p>
              </div>
            </div>
          )}

          {/* Idle State */}
          {state === "idle" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-sky-600 dark:text-sky-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
              </div>
              <button
                onClick={startRecording}
                className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
              >
                Start Recording
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                3 free trials per day
              </p>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="space-y-4">
              {rateLimitError ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-amber-900 dark:text-amber-100 font-medium">
                    {rateLimitError.message}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                    Try again tomorrow or sign up for unlimited access!
                  </p>
                  <div className="mt-4 flex gap-3 justify-center">
                    <a
                      href="/auth/sign-up"
                      className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Sign Up Now
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-900 dark:text-red-100 font-medium">
                    {error}
                  </p>
                  <button
                    onClick={reset}
                    className="mt-3 px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
