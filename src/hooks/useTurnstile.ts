"use client";

import { useCallback, useState } from "react";

const isDev = process.env.NODE_ENV !== "production";

export function useTurnstile() {
  const [token, setToken] = useState<string>(isDev ? "dev-turnstile-token" : "");
  const [verified, setVerified] = useState<boolean>(isDev);
  const [error, setError] = useState<string | null>(null);

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

  return {
    token,
    verified,
    error,
    handleVerify,
    handleError,
    handleExpire,
  };
}
