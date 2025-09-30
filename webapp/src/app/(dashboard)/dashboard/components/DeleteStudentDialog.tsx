"use client";

import { useCallback, useState } from "react";
import { deleteStudentAction } from "@/app/actions/students";
import type { DashboardStudent } from "@/lib/types";

interface DeleteStudentDialogProps {
  open: boolean;
  student: DashboardStudent | null;
  onDismiss: () => void;
  onStudentDeleted: () => void;
}

export function DeleteStudentDialog({ open, student, onDismiss, onStudentDeleted }: DeleteStudentDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    if (!student) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteStudentAction(student.id);
      onStudentDeleted();
      onDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete student";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }, [student, onStudentDeleted, onDismiss]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onDismiss();
    }
  }, [onDismiss]);

  if (!open || !student) {
    return null;
  }

  const formatLastSession = (dateString?: string) => {
    if (!dateString) return "No sessions yet";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-slate-950/70 px-4 py-8"
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-6 shadow-xl shadow-black/20 dark:shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Delete Student</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete this student? This action cannot be undone and will also delete all their sessions.
          </p>
        </header>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {student.totalSessions} sessions • Last: {formatLastSession(student.lastSessionDate)}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 shrink-0">
              {student.totalSessions} sessions
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            Added {new Date(student.createdAt).toLocaleDateString()}
          </p>
        </div>

        {student.totalSessions > 0 && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
            <p className="text-xs text-rose-600 dark:text-rose-200">
              ⚠️ Warning: Deleting this student will also permanently delete all {student.totalSessions} of their session records.
            </p>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-600 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDismiss}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-rose-500/30 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Student"}
          </button>
        </div>
      </div>
    </div>
  );
}