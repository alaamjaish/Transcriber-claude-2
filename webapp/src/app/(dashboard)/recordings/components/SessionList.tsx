"use client";

import { useCallback, useState } from "react";

import { deleteSessionAction } from "@/app/actions/sessions";
import type { Session } from "@/lib/types";
import { statusLabel } from "@/lib/placeholder-data";

function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return "0:00";
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString();
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null);

  const toggleTranscript = useCallback((sessionId: string) => {
    setOpenTranscriptId((current) => (current === sessionId ? null : sessionId));
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Transcript copied to clipboard.");
    } catch (error) {
      console.error("Clipboard error", error);
      alert("Unable to copy transcript. Check browser permissions.");
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

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteSessionAction(sessionId);
    } catch (error) {
      console.error("Delete error", error);
      alert("Failed to delete session. Please try again.");
    }
  }, []);

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const transcript = session.transcript ?? "";
        const hasTranscript = Boolean(transcript.trim());
        const isOpen = openTranscriptId === session.id;
        const displayTimestamp = new Date(session.recordedAt).toLocaleString();
        const fileBase = session.id || "session";
        const durationLabel = formatDuration(session.durationMs);

        return (
          <article
            key={session.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-100">{session.studentName ?? "Unassigned"}</p>
              <p className="text-xs text-slate-500">{displayTimestamp}</p>
              <p className="text-xs text-slate-500">Duration: {durationLabel}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                {session.transcriptPreview || "No transcript captured."}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-400 md:text-right">
              <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-200">
                {statusLabel(session.generationStatus)}
              </span>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => toggleTranscript(session.id)}
                >
                  {isOpen ? "Hide" : "View"}
                </button>
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => copyToClipboard(transcript)}
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
              {isOpen ? (
                <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-left text-xs text-slate-200">
                  {hasTranscript ? transcript : "No transcript available for this session."}
                </pre>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
