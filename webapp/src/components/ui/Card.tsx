import type { ReactNode } from "react";

interface CardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, description, actions, children, footer }: CardProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-sm shadow-black/20">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-slate-100">{title}</h2>
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children ? <div className="mt-4 space-y-4 text-sm text-slate-300">{children}</div> : null}
      {footer ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">{footer}</div> : null}
    </section>
  );
}
