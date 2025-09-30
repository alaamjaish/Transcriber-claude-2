"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { deleteSessionAction } from "@/app/actions/sessions";
import { useSessionList } from "./SessionListProvider";
import { statusLabel } from "@/lib/placeholder-data";
import { ContextModal } from "./ContextModal";


type PanelKey = "transcript" | "summary" | "homework";

type PanelState = Record<PanelKey, boolean>;
type PendingEntry = { summary: boolean; homework: boolean };
type PendingMap = Record<string, PendingEntry>;
type PendingKey = keyof PendingEntry;

function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return "0:00";
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString();
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function SessionList() {
  const router = useRouter();
  const { sessions, updateSession, removeSession } = useSessionList();
  const [openPanels, setOpenPanels] = useState<Record<string, PanelState>>({});
  const [pendingGenerations, setPendingGenerations] = useState<PendingMap>({});
  const [contextModal, setContextModal] = useState<{
    isOpen: boolean;
    sessionId: string;
    type: "summary" | "homework";
  }>({ isOpen: false, sessionId: "", type: "summary" });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const togglePanel = useCallback((sessionId: string, panel: PanelKey) => {
    setOpenPanels((prev) => {
      const current = prev[sessionId] ?? { transcript: false, summary: false, homework: false };
      return {
        ...prev,
        [sessionId]: { ...current, [panel]: !current[panel] },
      };
    });
  }, []);

  const isPanelOpen = useCallback(
    (sessionId: string, panel: PanelKey) => openPanels[sessionId]?.[panel] ?? false,
    [openPanels],
  );

  const toggleSessionExpanded = useCallback((sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const isSessionExpanded = useCallback(
    (sessionId: string) => expandedSessions.has(sessionId),
    [expandedSessions],
  );

  const setPending = useCallback((sessionId: string, key: PendingKey, value: boolean) => {
    setPendingGenerations((prev) => {
      const current = prev[sessionId] ?? { summary: false, homework: false };
      if (current[key] === value) {
        return prev;
      }
      const nextEntry: PendingEntry = { ...current, [key]: value };
      const next: PendingMap = { ...prev, [sessionId]: nextEntry };
      if (!nextEntry.summary && !nextEntry.homework) {
        delete next[sessionId];
      }
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch (error) {
      console.error("Clipboard error", error);
      alert("Unable to copy content. Check browser permissions.");
    }
  }, []);

  const downloadText = useCallback((text: string, fileName: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
        return;
      }

      try {
        await deleteSessionAction(sessionId);
        removeSession(sessionId);
        router.refresh();
      } catch (error) {
        console.error("Delete error", error);
        alert("Failed to delete session. Please try again.");
      }
    },
    [router, removeSession],
  );

  const regenerateSummary = useCallback(
    (sessionId: string, context?: string, selectedPromptId?: string) => {
      setPending(sessionId, "summary", true);

      updateSession(sessionId, (session) => ({
        ...session,
        aiGenerationStatus: "generating",
        generationStatus: "generating",
      }));

      generateSessionArtifactsAction(sessionId, { summary: true, homework: false }, context, selectedPromptId).catch((error) => {
        console.error("Summary generation error", error);
        alert("Failed to start summary generation. Please try again.");
        setPending(sessionId, "summary", false);
        updateSession(sessionId, (session) => ({
          ...session,
          aiGenerationStatus: session.aiGenerationStatus === "generating" ? "error" : session.aiGenerationStatus,
          generationStatus: session.generationStatus === "generating" ? "error" : session.generationStatus,
        }));
      });

      // Force immediate refresh to show "generating" status
      router.refresh();
    },
    [router, setPending, updateSession],
  );

  const regenerateHomework = useCallback(
    (sessionId: string, context?: string, selectedPromptId?: string) => {
      setPending(sessionId, "homework", true);

      updateSession(sessionId, (session) => ({
        ...session,
        aiGenerationStatus: "generating",
        generationStatus: "generating",
      }));

      generateSessionArtifactsAction(sessionId, { summary: false, homework: true }, context, selectedPromptId).catch((error) => {
        console.error("Homework generation error", error);
        alert("Failed to start homework generation. Please try again.");
        setPending(sessionId, "homework", false);
        updateSession(sessionId, (session) => ({
          ...session,
          aiGenerationStatus: session.aiGenerationStatus === "generating" ? "error" : session.aiGenerationStatus,
          generationStatus: session.generationStatus === "generating" ? "error" : session.generationStatus,
        }));
      });

      // Force immediate refresh to show "generating" status
      router.refresh();
    },
    [router, setPending, updateSession],
  );

  const openContextModal = useCallback((sessionId: string, type: "summary" | "homework") => {
    setContextModal({ isOpen: true, sessionId, type });
  }, []);

  const closeContextModal = useCallback(() => {
    setContextModal({ isOpen: false, sessionId: "", type: "summary" });
  }, []);

  const handleGenerateWithContext = useCallback((context: string, selectedPromptId?: string) => {
    const { sessionId, type } = contextModal;
    if (type === "summary") {
      regenerateSummary(sessionId, context, selectedPromptId);
    } else {
      regenerateHomework(sessionId, context, selectedPromptId);
    }
    closeContextModal();
  }, [contextModal, regenerateSummary, regenerateHomework, closeContextModal]);

  useEffect(() => {
    setPendingGenerations((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }

      const next: PendingMap = { ...prev };
      let changed = false;
      const activeIds = new Set(sessions.map((session) => session.id));

      Object.keys(next).forEach((id) => {
        if (!activeIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      sessions.forEach((session) => {
        if (session.aiGenerationStatus !== "generating" && next[session.id]) {
          delete next[session.id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sessions]);

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

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const transcript = session.transcript ?? "";
        const hasTranscript = Boolean(transcript.trim());
        const summary = session.summaryMd ?? "";
        const homework = session.homeworkMd ?? "";
        const summaryReady = Boolean(summary.trim());
        const homeworkReady = Boolean(homework.trim());

        const isAiGenerating = session.aiGenerationStatus === "generating";
        const pending = pendingGenerations[session.id] ?? { summary: false, homework: false };
        const summaryPending = pending.summary || (isAiGenerating && !summaryReady);
        const homeworkPending = pending.homework || (isAiGenerating && !homeworkReady);
        const headerPending = summaryPending || homeworkPending || isAiGenerating;

        const transcriptOpen = isPanelOpen(session.id, "transcript");
        const summaryOpen = isPanelOpen(session.id, "summary");
        const homeworkOpen = isPanelOpen(session.id, "homework");

        const recordedDate = new Date(session.recordedAt);
        const dateOnly = recordedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g., "Sep 30"
        const durationLabel = formatDuration(session.durationMs);
        const fileBase = session.id || "session";

        const summaryStatus = !hasTranscript
          ? "Transcript required first"
          : summaryPending
          ? "Generating..."
          : summaryReady
          ? "Ready"
          : "Not generated yet";

        const homeworkStatus = !hasTranscript
          ? "Transcript required first"
          : homeworkPending
          ? "Generating..."
          : homeworkReady
          ? "Ready"
          : "Not generated yet";

        const isExpanded = isSessionExpanded(session.id);

        return (
          <article
            key={session.id}
            className={`rounded-xl border transition-all p-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg ${isExpanded ? "border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/40 shadow-md" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm"}`}
            onClick={() => toggleSessionExpanded(session.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate w-40"
                    title={session.studentName ?? "Unassigned"}
                  >
                    {session.studentName ?? "Unassigned"}
                  </span>
                  <span className="text-base font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
                    {dateOnly}
                  </span>
                </div>
                {headerPending ? (
                  <span className="rounded-full border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generating...
                  </span>
                ) : session.generationStatus === "complete" || (summaryReady && homeworkReady) ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs whitespace-nowrap flex-shrink-0">
                    Complete
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 px-3 py-1 text-xs whitespace-nowrap flex-shrink-0">
                    {statusLabel(session.generationStatus)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-20 text-left">Duration:</span>
                  <span className="inline-block w-16 tabular-nums text-right">{durationLabel}</span>
                </span>
                <svg
                  className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    className="rounded-md border border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-600/10 px-3 py-1 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-600/20 transition-colors"
                    onClick={() => togglePanel(session.id, "transcript")}
                  >
                    {transcriptOpen ? "Hide transcript" : "View transcript"}
                  </button>
                  <button
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => copyToClipboard(transcript, "Transcript copied to clipboard.")}
                    disabled={!hasTranscript}
                  >
                    Copy
                  </button>
                  <button
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => downloadText(transcript, `${fileBase}.txt`)}
                    disabled={!hasTranscript}
                  >
                    Export .txt
                  </button>
                  <button
                    className="rounded-md border border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-600/10 px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-600/20 transition-colors"
                    onClick={() => deleteSession(session.id)}
                  >
                    Delete
                  </button>
                </div>

                {transcriptOpen && (
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3 text-xs text-slate-900 dark:text-slate-200">
                    {hasTranscript ? transcript : "No transcript available for this session."}
                  </pre>
                )}

                <section className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Summary</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{summaryStatus}</span>
                    <div className="flex flex-wrap gap-2 md:ml-auto">
                      <button
                        className="rounded-md border border-sky-500 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 text-sky-600 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-500/20 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                        onClick={() => togglePanel(session.id, "summary")}
                        disabled={!summaryReady}
                      >
                        {summaryOpen ? "Hide" : "View"}
                      </button>
                      <button
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => copyToClipboard(summary, "Summary copied to clipboard.")}
                        disabled={!summaryReady}
                      >
                        Copy .md
                      </button>
                      <button
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => downloadText(summary, `${fileBase}-summary.md`)}
                        disabled={!summaryReady}
                      >
                        Export .md
                      </button>
                      <button
                        className="rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                        onClick={() => openContextModal(session.id, "summary")}
                        disabled={!hasTranscript || summaryPending}
                      >
                        {summaryPending ? "Generating..." : summaryReady ? "Regenerate" : "Generate"}
                      </button>
                    </div>
                  </div>
                  {summaryOpen && (
                    <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 text-xs text-slate-900 dark:text-slate-200">
                      {summaryReady ? summary : "Summary not available yet."}
                    </pre>
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Homework</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{homeworkStatus}</span>
                    <div className="flex flex-wrap gap-2 md:ml-auto">
                      <button
                        className="rounded-md border border-sky-500 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 text-sky-600 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-500/20 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                        onClick={() => togglePanel(session.id, "homework")}
                        disabled={!homeworkReady}
                      >
                        {homeworkOpen ? "Hide" : "View"}
                      </button>
                      <button
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => copyToClipboard(homework, "Homework copied to clipboard.")}
                        disabled={!homeworkReady}
                      >
                        Copy .md
                      </button>
                      <button
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => downloadText(homework, `${fileBase}-homework.md`)}
                        disabled={!homeworkReady}
                      >
                        Export .md
                      </button>
                      <button
                        className="rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:border-slate-300 dark:disabled:border-slate-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                        onClick={() => openContextModal(session.id, "homework")}
                        disabled={!hasTranscript || homeworkPending}
                      >
                        {homeworkPending ? "Generating..." : homeworkReady ? "Regenerate" : "Generate"}
                      </button>
                    </div>
                  </div>
                  {homeworkOpen && (
                    <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 text-xs text-slate-900 dark:text-slate-200">
                      {homeworkReady ? homework : "Homework not available yet."}
                    </pre>
                  )}
                </section>
              </div>
            )}
          </article>
        );
      })}

      <ContextModal
        isOpen={contextModal.isOpen}
        onClose={closeContextModal}
        onGenerate={handleGenerateWithContext}
        type={contextModal.type}
        isPending={pendingGenerations[contextModal.sessionId]?.[contextModal.type] ?? false}
      />
    </div>
  );
}

