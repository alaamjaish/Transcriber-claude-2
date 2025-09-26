import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadStudents } from "@/lib/data-loaders";
import type { Student } from "@/lib/types";

export default async function StudentsPage() {
  let students: Student[] = [];
  let errorMessage: string | null = null;

  try {
    students = await loadStudents();
  } catch (error) {
    console.error("Failed to load students", error);
    errorMessage = "We couldn't load your students. Verify Supabase credentials and try again.";
  }

  const hasStudents = students.length > 0;

  return (
    <div className="space-y-8">
      <Card
        title="Student directory"
        description="Manage the roster, set a current student before recording, and drill into historical sessions."
        footer={<p>Later we will add search, filters, and bulk actions here.</p>}
      >
        {errorMessage ? (
          <EmptyState
            title="Unable to load students"
            description={errorMessage}
            actionLabel="Reload"
            actionHref="/students"
            aside={<span>If this persists, check that your Supabase env vars are set and the schema has been deployed.</span>}
          />
        ) : hasStudents ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {students.map((student) => (
              <li key={student.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-100">{student.name}</h3>
                  <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
                    {student.totalSessions ?? 0} sessions
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Added {new Date(student.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Link
                    href={`/students/${student.id}`}
                    className="rounded-md border border-slate-700 px-3 py-1 text-slate-100 hover:border-slate-500"
                  >
                    Open workspace
                  </Link>
                  <button className="rounded-md border border-slate-700 px-3 py-1 hover:border-slate-500">
                    Set as current
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No students yet"
            description="Add your first student to start organising sessions."
            actionLabel="Create student"
            actionHref="/students"
          />
        )}
      </Card>
    </div>
  );
}

