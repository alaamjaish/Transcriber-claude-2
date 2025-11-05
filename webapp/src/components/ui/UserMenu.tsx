"use client";

import { useState, useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";

interface UserMenuProps {
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}

export function UserMenu({ userEmail, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!userEmail) {
    return (
      <div className="rounded-full border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-4 py-2">
        <span className="text-slate-600 dark:text-slate-400 text-sm">Demo mode</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 px-4 py-2 text-slate-900 dark:text-slate-100 transition hover:border-slate-400 dark:hover:border-slate-500"
        aria-label="User menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Signed in as</p>
            <p className="text-sm text-slate-900 dark:text-slate-100 break-all">{userEmail}</p>
          </div>
          {onSignOut && (
            <div className="p-2">
              <form action={onSignOut}>
                <SignOutButton onClick={() => setIsOpen(false)} />
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignOutButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      onClick={onClick}
      className="w-full text-left rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
