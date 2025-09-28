"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { SelectedStudentProvider } from "@/components/layout/SelectedStudentProvider";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/recordings", label: "Recordings" },
  { href: "/students", label: "Students" },
  { href: "/prompts", label: "Prompts" },
];

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  userEmail?: string;
  onSignOut?: () => Promise<void>;
  initialStudentId?: string | null;
  initialStudentName?: string | null;
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  userEmail,
  onSignOut,
  initialStudentId = null,
  initialStudentName = null,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <SelectedStudentProvider initialStudentId={initialStudentId} initialStudentName={initialStudentName}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace</p>
            <h1 className="text-3xl font-semibold text-slate-100 md:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-400">
            <div className="rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2">
              {userEmail ? (
                <>
                  <span className="text-slate-500">Signed in as</span>
                  <span className="ml-2 text-slate-100">{userEmail}</span>
                </>
              ) : (
                <span className="text-slate-400">Demo mode</span>
              )}
            </div>
            {onSignOut ? (
              <form action={onSignOut}>
                <SignOutButton />
              </form>
            ) : null}
            {actions}
          </div>
        </header>

        <nav className="sticky top-0 z-20 -mx-6 border-y border-slate-800 bg-slate-950/80 px-6 backdrop-blur">
          <ul className="flex gap-6 overflow-x-auto py-4 text-sm font-semibold">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`rounded-md px-3 py-2 transition ${
                      isActive
                        ? "bg-slate-800 text-slate-50 shadow-sm shadow-black/20"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex flex-1 flex-col gap-8 pb-20">{children}</main>

        <footer className="border-t border-slate-800 pt-6 text-xs text-slate-500">
          <p>Next.js foundation build &mdash; replace placeholders as features are implemented.</p>
        </footer>
      </div>
    </SelectedStudentProvider>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="rounded-md border border-slate-700 px-4 py-2 text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

