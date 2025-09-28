"use client";

import { useCallback, useState } from "react";
import { deletePromptAction } from "@/app/actions/prompts";
import type { Prompt } from "@/lib/types";

interface DeletePromptDialogProps {
  open: boolean;
  prompt: Prompt | null;
  onDismiss: () => void;
  onPromptDeleted: () => void;
}

export function DeletePromptDialog({ open, prompt, onDismiss, onPromptDeleted }: DeletePromptDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    if (!prompt) return;

    setDeleting(true);
    setError(null);

    try {
      await deletePromptAction(prompt.id);
      onPromptDeleted();
      onDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete prompt";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }, [prompt, onPromptDeleted, onDismiss]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onDismiss();
    }
  }, [onDismiss]);

  if (!open || !prompt) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8"
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">Delete Prompt</h2>
          <p className="text-sm text-slate-400">
            Are you sure you want to delete this prompt? This action cannot be undone.
          </p>
        </header>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="font-semibold text-slate-100">{prompt.name}</h3>
          <p className="mt-1 text-xs text-slate-400 line-clamp-3">
            {prompt.promptText.length > 150
              ? `${prompt.promptText.substring(0, 150)}...`
              : prompt.promptText}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Created {new Date(prompt.createdAt).toLocaleDateString()}
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
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
            {deleting ? "Deleting..." : "Delete Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}