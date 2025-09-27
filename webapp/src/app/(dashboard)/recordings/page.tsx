import { Card } from "@/components/ui/Card";
import { loadRecentSessions } from "@/lib/data-loaders";
import type { Session } from "@/lib/types";

import { RecordingWorkspaceShell } from "./components/RecordingWorkspaceShell";
import { SessionListPanel } from "./components/SessionListPanel";
import { SessionListProvider } from "./components/SessionListProvider";

// Force dynamic rendering to prevent caching issues
export const dynamic = "force-dynamic";

const controls = [
  {
    label: "Start recording",
    description:
      "Initialises audio graph, prompts for microphone access, and begins streaming to the transcription service.",
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

  return (
    <SessionListProvider initialSessions={sessions}>
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
          <SessionListPanel errorMessage={errorMessage} />
        </Card>
      </div>
    </SessionListProvider>
  );
}

