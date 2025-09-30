"use client";

import { useState, useEffect } from "react";
import { listPromptsAction } from "@/app/actions/prompts";
import type { Prompt } from "@/lib/types";

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: string, selectedPromptId?: string) => void;
  type: "summary" | "homework";
  isPending: boolean;
}

export function ContextModal({ isOpen, onClose, onGenerate, type, isPending }: ContextModalProps) {
  const [context, setContext] = useState("");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("default");
  const [promptsLoading, setPromptsLoading] = useState(false);

  const handleGenerate = () => {
    const promptId = selectedPromptId === "default" ? undefined : selectedPromptId;
    onGenerate(context.trim(), promptId);
    setContext("");
    setSelectedPromptId("default");
  };

  const handleClose = () => {
    onClose();
    setContext("");
    setSelectedPromptId("default");
  };

  // Load prompts when modal opens
  useEffect(() => {
    if (isOpen && prompts.length === 0) {
      setPromptsLoading(true);
      listPromptsAction()
        .then(setPrompts)
        .catch(error => {
          console.error("Failed to load prompts:", error);
        })
        .finally(() => setPromptsLoading(false));
    }
  }, [isOpen, prompts.length]);

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 p-6 shadow-2xl">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
             Regenerate {type === "summary" ? "Summary" : "Homework"}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Add any extra context or instructions (optional)
          </p>
        </div>

        <div className="space-y-6">
          {/* Prompt Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
              Select Prompt
            </label>
            {promptsLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400 py-4">Loading your prompts...</div>
            ) : (
              <div className="space-y-2">
                {/* Default Prompt */}
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="prompt-selection"
                    value="default"
                    checked={selectedPromptId === "default"}
                    onChange={() => setSelectedPromptId("default")}
                    className="mt-1 h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-400 focus:ring-sky-500"
                    disabled={isPending}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Default System Prompt</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Uses the built-in {type} generation prompt
                    </div>
                  </div>
                </label>

                {/* Custom Prompts */}
                {prompts.map((prompt) => (
                  <label key={prompt.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="prompt-selection"
                      value={prompt.id}
                      checked={selectedPromptId === prompt.id}
                      onChange={() => setSelectedPromptId(prompt.id)}
                      className="mt-1 h-4 w-4 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-950 text-sky-400 focus:ring-sky-500"
                      disabled={isPending}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{prompt.name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {prompt.promptText.length > 100
                          ? `${prompt.promptText.substring(0, 100)}...`
                          : prompt.promptText}
                      </div>
                    </div>
                  </label>
                ))}

                {prompts.length === 0 && !promptsLoading && (
                  <div className="text-sm text-slate-500 dark:text-slate-500 py-4 text-center">
                    No custom prompts yet. <br />
                    <a href="/prompts" className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300">Create your first prompt →</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Context Section */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
              Additional Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any specific instructions for this generation..."
              className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              rows={3}
              disabled={isPending}
            />

          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex-1 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Generating..." : context.trim() ? "Generate with Context" : "Generate"}
          </button>
        </div>

      </div>
    </div>
  );
}
