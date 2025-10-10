"use client";

import { useState, useEffect } from "react";
import { MarkdownContent } from "@/components/ui/MarkdownContent";

interface EditModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onSave: (newContent: string) => Promise<void>;
}

export function EditModal({ isOpen, title, content, onClose, onSave }: EditModalProps) {
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update draft when content changes (e.g., different session opened)
  useEffect(() => {
    setDraft(content);
    setError(null);
  }, [content, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(content); // Reset to original
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl h-[90vh] mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            ✏️ Edit {title}
          </h2>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Split view content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Markdown Editor
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 px-6 py-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 font-mono resize-none focus:outline-none"
              placeholder="Enter markdown content here..."
              disabled={saving}
            />
          </div>

          {/* Right: Preview */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Preview
              </span>
            </div>
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <MarkdownContent content={draft} emptyMessage="Preview will appear here..." />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || draft === content}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                💾 Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
