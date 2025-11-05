"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SelectedStudentProvider } from "@/components/layout/SelectedStudentProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/prompts", label: "Prompts Library" },
  { href: "/settings", label: "Settings" },
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
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Workspace</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 md:text-4xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-400">
            <ThemeToggle />
            <UserMenu userEmail={userEmail} onSignOut={onSignOut} />
            {actions}
          </div>
        </header>

        <nav className="sticky top-0 z-20 -mx-6 border-y border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-6 backdrop-blur">
          <ul className="flex gap-6 overflow-x-auto py-4 text-sm font-semibold">
            {navItems.map((item) => {
              // Smart navigation logic: individual student pages highlight Dashboard
              const isIndividualStudentPage = pathname.startsWith('/students/') && pathname.split('/').length === 3;

              let isActive;
              if (item.href === '/dashboard') {
                // Dashboard is active on /dashboard OR individual student pages
                isActive = pathname === '/dashboard' || isIndividualStudentPage;
              } else {
                // Default logic for other nav items
                isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`rounded-md px-3 py-2 transition ${
                      isActive
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm shadow-black/5 dark:shadow-black/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-6 text-xs text-slate-500 dark:text-slate-500">
          <p>Next.js foundation build &mdash; replace placeholders as features are implemented.</p>
        </footer>
      </div>
    </SelectedStudentProvider>
  );
}

