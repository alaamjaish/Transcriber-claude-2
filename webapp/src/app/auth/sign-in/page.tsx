"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { signInAction } from "../actions";
import { initialAuthState } from "../state";
import { SubmitButton } from "../components/SubmitButton";

export default function SignInPage() {
  const [state, formAction] = useFormState(signInAction, initialAuthState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Email</label>
        <input
          type="email"
          name="email"
          placeholder="teacher@school.com"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Password</label>
        <input
          type="password"
          name="password"
          placeholder="********"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          required
        />
        <div className="text-right text-xs text-slate-500">
          <Link href="/auth/reset" className="text-sky-400 hover:text-sky-300">
            Forgot password?
          </Link>
        </div>
      </div>
      {state?.message ? (
        <p
          className={`text-xs ${state.messageType === "success" ? "text-emerald-400" : "text-rose-400"}`}
          role={state.messageType === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <SubmitButton idleLabel="Continue" pendingLabel="Signing in..." />
      <p className="text-center text-xs text-slate-500">
        New here? <Link href="/auth/sign-up" className="text-sky-400 hover:text-sky-300">Create an account</Link>
      </p>
    </form>
  );
}
