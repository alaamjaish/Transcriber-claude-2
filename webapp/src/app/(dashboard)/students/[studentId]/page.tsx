import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadSessionsForStudent, loadStudentById } from "@/lib/data-loaders";
import { statusLabel } from "@/lib/placeholder-data";
import type { Session, Student } from "@/lib/types";

interface StudentPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentPage({ params }: StudentPageProps) {
  const { studentId } = await params;

  let student: Student | null = null;
  try {
    student = await loadStudentById(studentId);
  } catch (error) {
    console.error("Failed to load student", error);
    throw error;
  }

  if (!student) {
    notFound();
  }

  let sessions: Session[] = [];
  let errorMessage: string | null = null;
  try {
    sessions = await loadSessionsForStudent(studentId);
  } catch (error) {
    console.error("Failed to load sessions for student", error);
    errorMessage = "We couldn't load this student's sessions. Verify Supabase settings and try again.";
  }

  const totalSessions = student.totalSessions ?? sessions.length;

  return (
    <div className="space-y-8">
      <Card
        title={student.name}
        description={`Created ${new Date(student.createdAt).toLocaleDateString()} • ${totalSessions} sessions recorded`}
        footer={
          <div className="flex flex-wrap gap-3 text-xs">
            <button className="rounded-md border border-slate-700 px-3 py-1 hover:border-slate-500">Rename</button>
            <button className="rounded-md border border-slate-700 px-3 py-1 hover:border-slate-500">Delete</button>
            <Link
              href="/recordings"
              className="rounded-md bg-sky-400 px-3 py-1 text-slate-900 hover:bg-sky-300"
            >
              Record for this student
            </Link>
          </div>
        }
      />

      <Card title="Sessions" description="Auditable list of sessions tied to this student.">
        {errorMessage ? (
          <EmptyState
            title="Unable to load sessions"
            description={errorMessage}
            actionLabel="Reload"
            actionHref={`/students/${studentId}`}
            aside={<span>If this persists, confirm your Supabase env vars and policies.</span>}
          />
        ) : sessions.length ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-100">{new Date(session.recordedAt).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Duration: {(session.durationMs / 60000).toFixed(0)} min</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-200">
                      {statusLabel(session.generationStatus)}
                    </span>
                    <button className="rounded-md border border-slate-700 px-3 py-1">Transcript</button>
                    <button className="rounded-md border border-slate-700 px-3 py-1">Summary</button>
                    <button className="rounded-md border border-slate-700 px-3 py-1">Homework</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No sessions for this student"
            description="Record a session and assign it here to populate this view."
            actionLabel="Go to recordings"
            actionHref="/recordings"
          />
        )}
      </Card>
    </div>
  );
}

