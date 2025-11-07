"use client";

import type { RecordingPhase } from "./RecordingConsole";

interface RecordingControlsProps {
  phase: RecordingPhase;
  onStart: () => Promise<void> | void;
  onStop: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
  disabled?: boolean;
}

export function RecordingControls({ phase, onStart, onStop, onCancel, disabled }: RecordingControlsProps) {
  const isIdle = phase === "idle" || phase === "error" || phase === "finished";
  const isLive = phase === "live" || phase === "reconnecting";  // Allow stop during reconnection
  const isBusy = phase === "requesting" || phase === "connecting";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="rounded-xl bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onStart()}
        disabled={!isIdle || disabled}
      >
        Start recording
      </button>
      <button
        type="button"
        className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onStop()}
        disabled={!isLive}
      >
        Stop
      </button>
      <button
        type="button"
        className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onCancel()}
        disabled={isIdle || isBusy}
      >
        Cancel
      </button>
      <span className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">
        Phase: {phase}
      </span>
    </div>
  );
}