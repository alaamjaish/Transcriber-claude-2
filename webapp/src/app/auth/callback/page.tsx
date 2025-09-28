"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code and other params from the URL
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(errorDescription || error || "Authentication failed");
          return;
        }

        if (code) {
          // Exchange the code for a session
          const response = await fetch("/api/auth/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            setStatus("success");
            setMessage("Email confirmed successfully! You can now sign in.");

            // Redirect to sign-in after a brief delay
            setTimeout(() => {
              router.push("/auth/sign-in");
            }, 3000);
          } else {
            setStatus("error");
            setMessage("Failed to confirm email. Please try again.");
          }
        } else {
          setStatus("error");
          setMessage("Invalid confirmation link.");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-950/80 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100">Email Confirmation</h1>
        </div>

        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <svg className="h-8 w-8 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              </div>
              <p className="text-slate-400">Confirming your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/20 p-3">
                  <svg className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-emerald-400 font-medium">{message}</p>
              <p className="text-sm text-slate-500">Redirecting to sign in...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="rounded-full bg-rose-500/20 p-3">
                  <svg className="h-8 w-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="text-rose-400 font-medium">{message}</p>
              <Link
                href="/auth/sign-in"
                className="inline-block text-sm text-sky-400 hover:text-sky-300 underline"
              >
                Go to Sign In
              </Link>
            </>
          )}
        </div>

        {status !== "loading" && (
          <div className="text-center pt-4 border-t border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              ← Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}