"use client";

import { EmptyState } from "@/components/ui/EmptyState";

import { SessionList } from "./SessionList";
import { useSessionList } from "./SessionListProvider";

interface SessionListPanelProps {
  errorMessage: string | null;
}

export function SessionListPanel({ errorMessage }: SessionListPanelProps) {
  const { sessions } = useSessionList();

  if (errorMessage) {
    return (
      <EmptyState
        title="Unable to load sessions"
        description={errorMessage}
        actionLabel="Reload"
        actionHref="/recordings"
        aside={<span>If the issue persists, confirm your Supabase env variables are set.</span>}
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        description="Start a recording to see it appear here."
        actionLabel="Start recording"
        actionHref="/recordings"
      />
    );
  }

  return <SessionList />;
}
