"use client";

interface TranscriptPaneProps {
  title: string;
  description: string;
  text: string;
  badge?: {
    label: string;
    tone: "muted" | "live" | "danger";
  };
}

const badgeClass = {
  muted: "border border-slate-700 text-slate-300",
  live: "border border-emerald-400/50 text-emerald-300",
  danger: "border border-rose-400/50 text-rose-300",
};

export function TranscriptPane({ title, description, text, badge }: TranscriptPaneProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {badge ? (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${badgeClass[badge.tone]}`}>
            {badge.label}
          </span>
        ) : null}
      </header>
      <pre className="min-h-[180px] whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200">
        {text || ""}
      </pre>
    </div>
  );
}