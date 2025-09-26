"use client";

interface StatusIndicatorProps {
  label: string;
  tone: "idle" | "busy" | "live" | "error";
  durationMs: number;
}

export function StatusIndicator({ label, tone, durationMs }: StatusIndicatorProps) {
  const toneClass = {
    idle: "bg-slate-800 text-slate-300",
    busy: "bg-amber-500/10 text-amber-300 border border-amber-400/40",
    live: "bg-emerald-500/10 text-emerald-300 border border-emerald-400/40",
    error: "bg-rose-500/10 text-rose-300 border border-rose-400/40",
  }[tone];

  const minutes = Math.floor(durationMs / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((durationMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 font-semibold ${toneClass}`}>
        <span className="inline-block h-2 w-2 rounded-full bg-current" />
        {label}
      </span>
      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-400">
        {minutes}:{seconds}
      </span>
    </div>
  );
}