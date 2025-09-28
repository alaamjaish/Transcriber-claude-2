"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { generateSessionArtifactsAction } from "@/app/actions/generation";
import { deleteSessionAction } from "@/app/actions/sessions";
import type { Session } from "@/lib/types";
import { statusLabel } from "@/lib/placeholder-data";

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

interface StudentSessionListProps {
  sessions: Session[];
}

export function StudentSessionList({ sessions }: StudentSessionListProps) {
  const router = useRouter();
  const [openPanels, setOpenPanels] = useState<Record<string, PanelState>>({});
  const [pendingGenerations, setPendingGenerations] = useState<PendingMap>({});

  const togglePanel = useCallback((sessionId: string, panel: PanelKey) => {
    setOpenPanels((prev) => {
      const current = prev[sessionId] ?? { transcript: false, summary: false, homework: false };
      return {
        ...prev,
        [sessionId]: { ...current, [panel]: !current[panel] },
      };
    });
  }, []);

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
        router.refresh();
      } catch (error) {
        console.error("Delete error", error);
        alert("Failed to delete session. Please try again.");
      }
    },
    [router],
  );

  const regenerateSummary = useCallback(
    (sessionId: string) => {
      setPending(sessionId, "summary", true);

      // Fire-and-forget: Start generation without blocking UI
      generateSessionArtifactsAction(sessionId, { summary: true, homework: false }).catch((error) => {
        console.error("Summary generation error", error);
        alert("Failed to start summary generation. Please try again.");
        setPending(sessionId, "summary", false);
      });

      // Force immediate refresh to show "generating" status
      router.refresh();
    },
    [router, setPending],
  );

  const regenerateHomework = useCallback(
    (sessionId: string) => {
      setPending(sessionId, "homework", true);

      // Fire-and-forget: Start generation without blocking UI
      generateSessionArtifactsAction(sessionId, { summary: false, homework: true }).catch((error) => {
        console.error("Homework generation error", error);
        alert("Failed to start homework generation. Please try again.");
        setPending(sessionId, "homework", false);
      });

      // Force immediate refresh to show "generating" status
      router.refresh();
    },
    [router, setPending],
  );

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

        const transcriptOpen = openPanels[session.id]?.transcript ?? false;
        const summaryOpen = openPanels[session.id]?.summary ?? false;
        const homeworkOpen = openPanels[session.id]?.homework ?? false;

        const timestamp = new Date(session.recordedAt).toLocaleString();
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

        return (
          <article key={session.id} className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-slate-100">{timestamp}</p>
                <p className="text-xs text-slate-500">Duration: {durationLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 md:justify-end">
                <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-200">
                  {headerPending ? "Generating" : statusLabel(session.generationStatus)}
                </span>
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => togglePanel(session.id, "transcript")}
                >
                  {transcriptOpen ? "Hide transcript" : "View transcript"}
                </button>
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => copyToClipboard(transcript, "Transcript copied to clipboard.")}
                  disabled={!hasTranscript}
                >
                  Copy
                </button>
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => downloadText(transcript, `${fileBase}.txt`)}
                  disabled={!hasTranscript}
                >
                  Export .txt
                </button>
                <button
                  className="rounded-md border border-red-600 bg-red-600/10 px-3 py-1 text-red-400 hover:bg-red-600/20"
                  onClick={() => deleteSession(session.id)}
                >
                  Delete
                </button>
              </div>
            </header>

            {transcriptOpen ? (
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                {hasTranscript ? transcript : "No transcript available for this session."}
              </pre>
            ) : null}

            <section className="space-y-2 rounded-xl border border-slate-900/80 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Summary</span>
                <span className="text-xs text-slate-400">{summaryStatus}</span>
                <div className="flex flex-wrap gap-2 md:ml-auto">
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => togglePanel(session.id, "summary")}
                    disabled={!summaryReady}
                  >
                    {summaryOpen ? "Hide" : "View"}
                  </button>
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => copyToClipboard(summary, "Summary copied to clipboard.")}
                    disabled={!summaryReady}
                  >
                    Copy .md
                  </button>
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => downloadText(summary, `${fileBase}-summary.md`)}
                    disabled={!summaryReady}
                  >
                    Export .md
                  </button>
                  <button
                    className="rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-emerald-300 transition hover:bg-emerald-500/20 disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400 disabled:hover:bg-slate-800"
                    onClick={() => regenerateSummary(session.id)}
                    disabled={!hasTranscript || summaryPending}
                  >
                    {summaryPending ? "Generating..." : summaryReady ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>
              {summaryOpen ? (
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                  {summaryReady ? summary : "Summary not available yet."}
                </pre>
              ) : null}
            </section>

            <section className="space-y-2 rounded-xl border border-slate-900/80 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Homework</span>
                <span className="text-xs text-slate-400">{homeworkStatus}</span>
                <div className="flex flex-wrap gap-2 md:ml-auto">
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => togglePanel(session.id, "homework")}
                    disabled={!homeworkReady}
                  >
                    {homeworkOpen ? "Hide" : "View"}
                  </button>
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => copyToClipboard(homework, "Homework copied to clipboard.")}
                    disabled={!homeworkReady}
                  >
                    Copy .md
                  </button>
                  <button
                    className="rounded-md border border-slate-700 px-3 py-1"
                    onClick={() => downloadText(homework, `${fileBase}-homework.md`)}
                    disabled={!homeworkReady}
                  >
                    Export .md
                  </button>
                  <button
                    className="rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-emerald-300 transition hover:bg-emerald-500/20 disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400 disabled:hover:bg-slate-800"
                    onClick={() => regenerateHomework(session.id)}
                    disabled={!hasTranscript || homeworkPending}
                  >
                    {homeworkPending ? "Generating..." : homeworkReady ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>
              {homeworkOpen ? (
                <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                  {homeworkReady ? homework : "Homework not available yet."}
                </pre>
              ) : null}
            </section>
          </article>
        );
      })}
    </div>
  );
}
