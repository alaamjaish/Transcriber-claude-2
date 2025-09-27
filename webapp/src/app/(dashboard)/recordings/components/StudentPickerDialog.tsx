"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createStudentAction } from "@/app/actions/students";
import { useSelectedStudent } from "@/components/layout/SelectedStudentProvider";
import type { Student } from "@/lib/types";

interface StudentPickerDialogProps {
  open: boolean;
  onDismiss: (reason?: "cancel" | "outside") => void;
  onStudentConfirmed: (student: { id: string; name: string }) => Promise<void> | void;
  students: Student[];
  loading: boolean;
  error: string | null;
}

export function StudentPickerDialog({ open, onDismiss, onStudentConfirmed, students, loading, error }: StudentPickerDialogProps) {
  const { currentStudentId, setCurrentStudent, pending: selectionPending, error: selectionError } =
    useSelectedStudent();
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Set initial selection when dialog opens
    if (currentStudentId) {
      setSelectedId(currentStudentId);
    } else if (students.length > 0) {
      setSelectedId(students[0].id);
    }
  }, [open, currentStudentId, students]);

  useEffect(() => {
    if (!open) {
      setNewStudentName("");
      setSubmitting(false);
      setFormError(null);
    }
  }, [open]);

  const hasStudents = students.length > 0;

  const handleCreateAndSelect = useCallback(async () => {
    const name = newStudentName.trim();
    if (!name) {
      throw new Error("Provide a student name");
    }
    const created = await createStudentAction(name);
    setSelectedId(created.id);
    setNewStudentName("");
    return { id: created.id, name: created.name };
  }, [newStudentName]);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setFormError(null);

    try {
      let target: { id: string; name: string } | null = null;

      if (newStudentName.trim()) {
        target = await handleCreateAndSelect();
      } else if (selectedId) {
        const existing = students.find((student) => student.id === selectedId);
        if (!existing) {
          throw new Error("Selected student not found");
        }
        target = { id: existing.id, name: existing.name };
      }

      if (!target) {
        throw new Error("Choose or create a student before starting");
      }

      await setCurrentStudent(target);
      await onStudentConfirmed(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set current student";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }, [handleCreateAndSelect, newStudentName, onStudentConfirmed, selectedId, setCurrentStudent, students]);

  const busy = loading || submitting || selectionPending;
  const feedback = useMemo(() => selectionError ?? error ?? formError, [error, selectionError, formError]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8"
      onClick={() => onDismiss("outside")}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">Pick a student before recording</h2>
          <p className="text-sm text-slate-400">
            Sessions are stored per student. Choose an existing workspace or add a new one to continue.
          </p>
        </header>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.3em] text-slate-500">Existing students</h3>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
              {loading ? (
                <div className="p-4 text-sm text-slate-400">Loading students...</div>
              ) : hasStudents ? (
                <ul className="divide-y divide-slate-800">
                  {students.map((student) => (
                    <li key={student.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <label className="flex flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="student-picker"
                          value={student.id}
                          checked={selectedId === student.id}
                          onChange={() => setSelectedId(student.id)}
                          className="h-4 w-4 border-slate-600 bg-slate-950 text-sky-400 focus:ring-sky-500"
                          disabled={busy}
                        />
                        <span className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-100">{student.name}</span>
                          <span className="text-xs text-slate-500">
                            Added {new Date(student.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-sm text-slate-400">No students yet. Add one below.</div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.3em] text-slate-500">Add new</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newStudentName}
                onChange={(event) => setNewStudentName(event.target.value)}
                placeholder="e.g. Layla Hasan"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                disabled={busy}
              />
              <button
                type="button"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    setFormError(null);
                    await handleCreateAndSelect();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to add student";
                    setFormError(message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={busy || !newStudentName.trim()}
              >
                Add
              </button>
            </div>
          </section>
        </div>

        {feedback ? (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
            {feedback}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onDismiss("cancel")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-sky-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
