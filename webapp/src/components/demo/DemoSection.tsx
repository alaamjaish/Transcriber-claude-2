"use client";

import { useState, useEffect } from "react";
import { DemoRecordingWorkspace } from "./DemoRecordingWorkspace";
import Link from "next/link";

interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetDate: string;
}

export function DemoSection() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkRateLimit = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/demo/check-limit");

      if (!response.ok) {
        throw new Error("Failed to check rate limit");
      }

      const data = await response.json();
      setRateLimitInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRateLimit();
  }, []);

  const handleComplete = () => {
    // Refresh rate limit info after completing a demo
    checkRateLimit();
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-8 shadow-lg text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="w-8 h-8 animate-spin text-slate-400"
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
          <p className="text-sm text-slate-500 dark:text-slate-500">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 shadow-lg text-center">
          <p className="text-red-900 dark:text-red-100 font-medium mb-4">{error}</p>
          <button
            onClick={checkRateLimit}
            className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!rateLimitInfo) {
    return null;
  }

  // Rate limit exceeded
  if (!rateLimitInfo.allowed) {
    const resetDate = new Date(rateLimitInfo.resetDate);
    const resetTime = resetDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-8 shadow-lg text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="w-12 h-12 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-2">
            You've used your 3 free trials for today!
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-6">
            Try again tomorrow at {resetTime} or sign up for unlimited access
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/auth/sign-up"
              className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
            >
              Sign Up for Free
            </Link>
            <Link
              href="/auth/sign-in"
              className="px-8 py-3 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show demo workspace
  return (
    <DemoRecordingWorkspace
      remaining={rateLimitInfo.remaining}
      onComplete={handleComplete}
    />
  );
}
