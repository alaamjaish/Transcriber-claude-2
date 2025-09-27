"use client";

import { createContext, useContext, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { setCurrentStudentAction } from "@/app/actions/student-preferences";

interface SelectedStudentContextValue {
  currentStudentId: string | null;
  currentStudentName: string | null;
  setCurrentStudent: (student: { id: string; name?: string | null } | null) => Promise<void>;
  pending: boolean;
  error: string | null;
}

const SelectedStudentContext = createContext<SelectedStudentContextValue | null>(null);

interface SelectedStudentProviderProps {
  initialStudentId?: string | null;
  initialStudentName?: string | null;
  children: ReactNode;
}

export function SelectedStudentProvider({
  initialStudentId = null,
  initialStudentName = null,
  children,
}: SelectedStudentProviderProps) {
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(initialStudentId);
  const [currentStudentName, setCurrentStudentName] = useState<string | null>(initialStudentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setCurrentStudent: SelectedStudentContextValue["setCurrentStudent"] = (student) => {
    const nextId = student?.id ?? null;
    const optimisticName = student?.name ?? null;

    setError(null);

    return new Promise<void>((resolve, reject) => {
      startTransition(() => {
        setCurrentStudentId(nextId);
        setCurrentStudentName(optimisticName);

        setCurrentStudentAction(nextId)
          .then((result) => {
            setCurrentStudentId(result.currentStudentId);
            setCurrentStudentName(result.studentName ?? optimisticName ?? null);
            resolve();
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : "Failed to set current student";
            setError(message);
            // revert optimistic update
            setCurrentStudentId(initialStudentId ?? null);
            setCurrentStudentName(initialStudentName ?? null);
            reject(err);
          });
      });
    });
  };

  return (
    <SelectedStudentContext.Provider
      value={{ currentStudentId, currentStudentName, setCurrentStudent, pending: isPending, error }}
    >
      {children}
    </SelectedStudentContext.Provider>
  );
}

export function useSelectedStudent(): SelectedStudentContextValue {
  const context = useContext(SelectedStudentContext);
  if (!context) {
    throw new Error("useSelectedStudent must be used within a SelectedStudentProvider");
  }
  return context;
}
