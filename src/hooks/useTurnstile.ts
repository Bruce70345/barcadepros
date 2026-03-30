"use client";

import { useCallback, useState } from "react";

export function useTurnstile() {
  const [token, setToken] = useState<string>("");
  const [verified, setVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  const handleVerify = useCallback((value: string) => {
    setToken(value);
    setVerified(true);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setVerified(false);
    setError("turnstile_error");
  }, []);

  const handleExpire = useCallback(() => {
    setVerified(false);
    setToken("");
  }, []);

  const reset = useCallback(() => {
    setVerified(false);
    setToken("");
    if (typeof window !== "undefined" && widgetId && window.turnstile?.reset) {
      window.turnstile.reset(widgetId);
    }
  }, [widgetId]);

  return {
    token,
    verified,
    error,
    setWidgetId,
    reset,
    handleVerify,
    handleError,
    handleExpire,
  };
}
