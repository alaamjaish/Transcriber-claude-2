import Link from "next/link";

export default function ConfirmEmailPage() {
  return (
    <>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-sky-500/20 p-4">
            <svg
              className="h-12 w-12 text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Check your email
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            We've sent you a confirmation link. Please check your inbox and click the link to verify your account.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-slate-100">Important:</strong> The confirmation link will expire in 24 hours.
            After confirming your email, you'll be able to sign in to your account.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Didn't receive the email? Check your spam folder.
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-block text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}
