"use client";

import { MarkdownContent } from "@/components/ui/MarkdownContent";
import Link from "next/link";

interface DemoResultsProps {
  transcript: string;
  summary: string;
  remaining: number;
  onReset: () => void;
}

export function DemoResults({ transcript, summary, remaining, onReset }: DemoResultsProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
        <div className="flex justify-center mb-3">
          <svg
            className="w-12 h-12 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
          Processing Complete!
        </h3>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          Your audio has been transcribed and summarized by AI
        </p>
        {remaining > 0 && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            You have {remaining} {remaining === 1 ? "trial" : "trials"} remaining today
          </p>
        )}
      </div>

      {/* Transcript Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-lg overflow-hidden">
        <div className="bg-slate-100 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Transcript
          </h4>
        </div>
        <div className="p-6 max-h-64 overflow-y-auto">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {transcript}
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-lg overflow-hidden">
        <div className="bg-sky-50 dark:bg-sky-900/20 px-6 py-4 border-b border-sky-200 dark:border-sky-800">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            AI-Generated Summary
          </h4>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          <MarkdownContent content={summary} emptyMessage="No summary available" />
        </div>
      </div>

      {/* Call to Action */}
      <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-8 text-center">
        <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Love what you see?
        </h4>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Sign up to unlock unlimited recording time, homework generation, student tracking, and more!
        </p>
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
          <Link
            href="/auth/sign-up"
            className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
          >
            Create Free Account
          </Link>
          <button
            onClick={onReset}
            className="px-8 py-3 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            Try Another Demo
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
          No credit card required • Free forever
        </p>
      </div>

      {/* Features Comparison */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-6">
        <h5 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-4">
          With a free account, you get:
        </h5>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Unlimited recording time</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Homework generation</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Student tracking & management</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Export to PDF</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Edit & regenerate summaries</span>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-slate-700 dark:text-slate-300">Save unlimited sessions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
