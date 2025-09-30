"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/types";

interface RecentSessionsListProps {
  sessions: Session[];
}

function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return "0 min";
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  return `${totalMinutes} min`;
}

export function RecentSessionsList({ sessions }: RecentSessionsListProps) {
  const router = useRouter();

  const handleSessionClick = (session: Session) => {
    if (session.studentId) {
      router.push(`/students/${session.studentId}`);
    }
  };

  // Polling mechanism for real-time status updates
  useEffect(() => {
    const hasGeneratingSession = sessions.some(
      (session) => session.aiGenerationStatus === "generating"
    );

    if (!hasGeneratingSession) return;

    const pollInterval = setInterval(() => {
      router.refresh();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [sessions, router]);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-500">
        No sessions yet. Start recording to see your recent activity here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const recordedDate = new Date(session.recordedAt);
        const dateLabel = recordedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const timeLabel = recordedDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const durationLabel = formatDuration(session.durationMs);

        const summaryReady = session.summaryReady;
        const homeworkReady = session.homeworkReady;
        const isGenerating = session.aiGenerationStatus === "generating";

        return (
          <article
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className="group cursor-pointer rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-3 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {session.studentName || "Unknown Student"}
                </h3>
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-600 flex-shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateLabel}
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span>{timeLabel}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {durationLabel}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                {isGenerating ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <>
                    <span className={`text-xs flex items-center gap-1 ${summaryReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                      {summaryReady ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      Summary
                    </span>
                    <span className={`text-xs flex items-center gap-1 ${homeworkReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
                      {homeworkReady ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      Homework
                    </span>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}