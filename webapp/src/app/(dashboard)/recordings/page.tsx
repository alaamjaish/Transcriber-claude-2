import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadRecentSessions } from "@/lib/data-loaders";
import { statusLabel } from "@/lib/placeholder-data";
import type { Session } from "@/lib/types";

import { RecordingWorkspaceShell } from "./components/RecordingWorkspaceShell";

const controls = [
  {
    label: "Start recording",
    description: "Initialises audio graph, prompts for microphone access, and begins streaming to the transcription service.",
  },
  {
    label: "Stop",
    description: "Finalises the session, persists the transcript, and schedules summary/homework generation.",
  },
  {
    label: "Cancel",
    description: "Discards the active stream and cleans up media tracks without saving anything.",
  },
];

export default async function RecordingsPage() {
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    sessions = await loadRecentSessions();
  } catch (error) {
    console.error("Failed to load sessions", error);
    errorMessage = "We couldn't load recent sessions. Verify your Supabase credentials and try again.";
  }

  const hasSessions = sessions.length > 0;

  return (
    <div className="space-y-8">
      <RecordingWorkspaceShell />

      <Card
        title="Workstation controls"
        description="High-level contract for the recording toolbar and its dependencies."
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {controls.map((control) => (
            <li key={control.label} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-slate-100">{control.label}</p>
              <p className="mt-2 text-xs text-slate-400">{control.description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Recent sessions" description="Latest saved sessions with generation status placeholders.">
        {errorMessage ? (
          <EmptyState
            title="Unable to load sessions"
            description={errorMessage}
            actionLabel="Reload"
            actionHref="/recordings"
            aside={<span>If the issue persists, confirm your Supabase env variables are set.</span>}
          />
        ) : hasSessions ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">{session.studentName ?? "Unassigned"}</p>
                  <p className="text-xs text-slate-500">{new Date(session.recordedAt).toLocaleString()}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                    {session.transcriptPreview || "No transcript available yet."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-xs text-slate-400 md:text-right">
                  <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-200">
                    {statusLabel(session.generationStatus)}
                  </span>
                  <div className="flex gap-2 md:justify-end">
                    <button className="rounded-md border border-slate-700 px-3 py-1">View</button>
                    <button className="rounded-md border border-slate-700 px-3 py-1">Summary</button>
                    <button className="rounded-md border border-slate-700 px-3 py-1">Homework</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No sessions yet"
            description="Start a recording to see it appear here."
            actionLabel="Start recording"
            actionHref="/recordings"
          />
        )}
      </Card>
    </div>
  );
}
