"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { signUpAction } from "../actions";
import { initialAuthState } from "../state";
import { SubmitButton } from "../components/SubmitButton";

export default function SignUpPage() {
  const [state, formAction] = useFormState(signUpAction, initialAuthState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Name</label>
        <input
          type="text"
          name="name"
          placeholder="Your name"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Work email</label>
        <input
          type="email"
          name="email"
          placeholder="teacher@school.com"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Password</label>
        <input
          type="password"
          name="password"
          placeholder="Create a password"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          minLength={6}
          required
        />
      </div>
      {state?.message ? (
        <p
          className={`text-xs ${state.messageType === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          role={state.messageType === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton idleLabel="Create account" pendingLabel="Creating..." />
      <p className="text-center text-xs text-slate-500 dark:text-slate-500">
        Already registered? <Link href="/auth/sign-in" className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300">Sign in instead</Link>
      </p>
    </form>
  );
}
