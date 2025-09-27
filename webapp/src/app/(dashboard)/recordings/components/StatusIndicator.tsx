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

  const indicatorClass = {
    idle: "inline-block h-2 w-2 rounded-full bg-current",
    busy: "inline-block h-2 w-2 rounded-full bg-current animate-pulse",
    live: "inline-block h-2 w-2 rounded-full bg-current animate-pulse",
    error: "inline-block h-2 w-2 rounded-full bg-current",
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
        {tone === "busy" ? (
          <svg className="h-3 w-3 animate-spin text-current" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : tone === "live" ? (
          <div className="relative">
            <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
            <span className="absolute inset-0 inline-block h-2 w-2 rounded-full bg-current animate-ping opacity-75" />
          </div>
        ) : (
          <span className={indicatorClass} />
        )}
        {label}
      </span>
      <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-400">
        {minutes}:{seconds}
      </span>
    </div>
  );
}