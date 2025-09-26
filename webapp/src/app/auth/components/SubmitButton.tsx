"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
}

export function SubmitButton({ idleLabel, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
