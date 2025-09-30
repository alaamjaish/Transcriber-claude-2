import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  aside?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, actionHref, aside }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-10 text-center text-slate-700 dark:text-slate-300">
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      {actionLabel && actionHref ? (
        <div className="mt-6 flex justify-center">
          <Link
            href={actionHref}
            className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
      {aside ? <div className="mt-8 text-xs text-slate-500 dark:text-slate-500">{aside}</div> : null}
    </div>
  );
}
