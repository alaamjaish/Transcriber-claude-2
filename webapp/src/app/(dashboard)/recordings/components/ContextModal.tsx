"use client";

import { useState } from "react";

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (context: string) => void;
  type: "summary" | "homework";
  isPending: boolean;
}

export function ContextModal({ isOpen, onClose, onGenerate, type, isPending }: ContextModalProps) {
  const [context, setContext] = useState("");

  const handleGenerate = () => {
    onGenerate(context.trim());
    setContext("");
  };

  const handleClose = () => {
    onClose();
    setContext("");
  };

  if (!isOpen) return null;

  const examples = type === "summary"
    ? [
        "Focus on key math concepts covered",
        "Student struggled with word problems",
        "This was a review lesson",
        "Make it more concise"
      ]
    : [
        "Keep exercises under 10 minutes",
        "Add more practice with fractions",
        "Student needs visual examples",
        "Focus on problem-solving steps"
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">
            ✨ Regenerate {type === "summary" ? "Summary" : "Homework"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Add any extra context or instructions (optional)
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Additional Context
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={`e.g., "${examples[0]}"`}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            rows={4}
            disabled={isPending}
          />

          <div className="text-xs text-slate-500">
            <p className="font-medium mb-1">Examples:</p>
            <ul className="space-y-1">
              {examples.map((example, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => setContext(example)}
                    className="text-left hover:text-sky-400 transition-colors"
                    disabled={isPending}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex-1 rounded-lg border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Generating..." : context.trim() ? "Generate with Context" : "Generate"}
          </button>
        </div>

        {context.trim() && (
          <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3">
            <p className="text-xs font-medium text-sky-300 mb-1">Preview:</p>
            <p className="text-xs text-sky-200">
              System will use automatic prompt + your context: &ldquo;{context.trim()}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}