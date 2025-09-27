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

interface StudentSessionListProps {
  sessions: Session[];
}

export function StudentSessionList({ sessions }: StudentSessionListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Transcript copied to clipboard");
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
        const isOpen = openId === session.id;
        const timestamp = new Date(session.recordedAt).toLocaleString();
        const durationLabel = formatDuration(session.durationMs);
        const fileBase = session.id || "session";

        return (
          <article
            key={session.id}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-slate-100">{timestamp}</p>
                <p className="text-xs text-slate-500">Duration: {durationLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-200">
                  {statusLabel(session.generationStatus)}
                </span>
                <button
                  className="rounded-md border border-slate-700 px-3 py-1"
                  onClick={() => toggle(session.id)}
                >
                  {isOpen ? "Hide transcript" : "Transcript"}
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
            </div>
            {isOpen ? (
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                {hasTranscript ? transcript : "No transcript available for this session."}
              </pre>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
