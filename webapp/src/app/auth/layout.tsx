import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (!error && session) {
      redirect("/recordings");
    }
  } catch (error) {
    console.warn("AuthLayout", error);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <header className="text-center">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Transcriber Studio
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-100">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in or create an account to access your workspace.</p>
      </header>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-black/20">
        {children}
      </div>
      <p className="text-center text-xs text-slate-500">
        Need access for your team? Reach out at <a className="text-sky-400" href="mailto:hello@example.com">hello@example.com</a>
      </p>
    </main>
  );
}
