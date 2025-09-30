import Link from "next/link";

export default function ResetPage() {
  return (
    <form className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Enter your email and we&apos;ll send a link to reset your password.
      </p>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500">Email</label>
        <input
          type="email"
          name="email"
          placeholder="teacher@school.com"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sky-300"
      >
        Send reset link
      </button>
      <p className="text-center text-xs text-slate-500 dark:text-slate-500">
        Remembered your credentials? <Link className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300" href="/auth/sign-in">Back to sign in</Link>
      </p>
    </form>
  );
}
