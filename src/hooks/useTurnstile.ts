"use client";

import { useCallback, useState } from "react";

export function useTurnstile() {
  const [token, setToken] = useState<string>("");
  const [verified, setVerified] = useState<boolean>(false);
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
