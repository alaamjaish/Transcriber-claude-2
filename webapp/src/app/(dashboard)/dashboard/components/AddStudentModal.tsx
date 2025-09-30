"use client";

import { useCallback, useEffect, useState } from "react";
import { createStudentAction } from "@/app/actions/students";

interface AddStudentModalProps {
  open: boolean;
  onDismiss: () => void;
  onStudentCreated: () => void;
}

export function AddStudentModal({ open, onDismiss, onStudentCreated }: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Student name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createStudentAction(trimmedName);
      onStudentCreated();
      onDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create student";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [name, onStudentCreated, onDismiss]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onDismiss();
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }, [onDismiss, handleSubmit]);

  if (!open) {
    return null;
  }

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
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Add New Student</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Add a student to start organizing their sessions and tracking their progress.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="student-name" className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
              Student Name
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Sarah Johnson"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              disabled={submitting}
              maxLength={100}
              autoFocus
            />
          </div>
        </div>

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
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-sky-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Adding..." : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  );
}