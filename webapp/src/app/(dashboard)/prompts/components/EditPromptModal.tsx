"use client";

import { useCallback, useEffect, useState } from "react";
import { updatePromptAction } from "@/app/actions/prompts";
import type { Prompt } from "@/lib/types";

interface EditPromptModalProps {
  open: boolean;
  prompt: Prompt | null;
  onDismiss: () => void;
  onPromptUpdated: () => void;
}

export function EditPromptModal({ open, prompt, onDismiss, onPromptUpdated }: EditPromptModalProps) {
  const [name, setName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && prompt) {
      setName(prompt.name);
      setPromptText(prompt.promptText);
      setError(null);
    } else if (!open) {
      setName("");
      setPromptText("");
      setSubmitting(false);
      setError(null);
    }
  }, [open, prompt]);

  const handleSubmit = useCallback(async () => {
    if (!prompt) return;

    const trimmedName = name.trim();
    const trimmedPromptText = promptText.trim();

    if (!trimmedName) {
      setError("Prompt name is required");
      return;
    }

    if (!trimmedPromptText) {
      setError("Prompt text is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updatePromptAction(prompt.id, trimmedName, trimmedPromptText);
      onPromptUpdated();
      onDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update prompt";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [prompt, name, promptText, onPromptUpdated, onDismiss]);

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
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-slate-100">Edit Prompt</h2>
          <p className="text-sm text-slate-400">
            Modify your custom prompt for AI generation.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-prompt-name" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Prompt Name
            </label>
            <input
              id="edit-prompt-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Detailed Summary Style"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              disabled={submitting}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-prompt-text" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Prompt Text
            </label>
            <textarea
              id="edit-prompt-text"
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="Write your custom prompt here..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 resize-none"
              disabled={submitting}
              rows={8}
            />
            <p className="text-xs text-slate-500">
              {promptText.length}/2000 characters
            </p>
          </div>
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
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-sky-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !promptText.trim()}
          >
            {submitting ? "Updating..." : "Update Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}