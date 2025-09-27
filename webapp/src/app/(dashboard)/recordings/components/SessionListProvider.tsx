"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Session } from "@/lib/types";

interface SessionListContextValue {
  sessions: Session[];
  appendSession: (session: Session) => void;
  updateSession: (sessionId: string, updater: (session: Session) => Session) => void;
  removeSession: (sessionId: string) => void;
}

const SessionListContext = createContext<SessionListContextValue | null>(null);

interface SessionListProviderProps {
  initialSessions: Session[];
  children: ReactNode;
}

export function SessionListProvider({ initialSessions, children }: SessionListProviderProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  useEffect(() => {
    setSessions((prev) => {
      const merged = [...initialSessions];
      const knownIds = new Set(initialSessions.map((session) => session.id));

      prev.forEach((session) => {
        if (!knownIds.has(session.id)) {
          merged.push(session);
        }
      });

      return merged;
    });
  }, [initialSessions]);

  const appendSession = useCallback((session: Session) => {
    setSessions((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== session.id);
      return [session, ...withoutDuplicate];
    });
  }, []);

  const updateSession = useCallback((sessionId: string, updater: (session: Session) => Session) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)));
  }, []);

  const removeSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  }, []);

  const value = useMemo(
    () => ({ sessions, appendSession, updateSession, removeSession }),
    [sessions, appendSession, updateSession, removeSession],
  );

  return <SessionListContext.Provider value={value}>{children}</SessionListContext.Provider>;
}

export function useSessionList() {
  const context = useContext(SessionListContext);
  if (!context) {
    throw new Error("useSessionList must be used within a SessionListProvider");
  }
  return context;
}

