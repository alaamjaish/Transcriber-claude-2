"use client";

import { useCallback, useState } from "react";

interface SonioxTokenState {
  apiKey: string | null;
  expiresAt: string | null;
  websocketUrl: string | null;
}

interface UseSonioxTokenResult extends SonioxTokenState {
  loading: boolean;
  error: string | null;
  fetchToken: () => Promise<SonioxTokenState>;
}

export function useSonioxToken(): UseSonioxTokenResult {
  const [state, setState] = useState<SonioxTokenState>({
    apiKey: null,
    expiresAt: null,
    websocketUrl: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/soniox/token", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : `Token request failed (${response.status})`;
        throw new Error(message);
      }

      const data = payload as Partial<SonioxTokenState>;
      if (!data.apiKey) {
        throw new Error("Server did not return a Soniox API key.");
      }

      const nextState: SonioxTokenState = {
        apiKey: data.apiKey,
        expiresAt: data.expiresAt ?? null,
        websocketUrl: data.websocketUrl ?? null,
      };

      setState(nextState);
      return nextState;
    } catch (err) {
      const message = (err as Error).message || "Failed to fetch Soniox token";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...state, loading, error, fetchToken };
}
