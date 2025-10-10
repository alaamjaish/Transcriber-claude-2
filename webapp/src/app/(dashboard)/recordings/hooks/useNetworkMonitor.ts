"use client";

import { useEffect, useState } from "react";

export function useNetworkMonitor() {
  const [isOnline, setIsOnline] = useState(true);
  const [justWentOnline, setJustWentOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setJustWentOnline(true);
      window.setTimeout(() => setJustWentOnline(false), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, justWentOnline };
}
