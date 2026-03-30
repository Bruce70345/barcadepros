"use client";

import { createContext, useContext } from "react";
import { useTurnstile } from "@/hooks/useTurnstile";

type TurnstileContextValue = ReturnType<typeof useTurnstile>;

const TurnstileContext = createContext<TurnstileContextValue | null>(null);

export function TurnstileProvider({ children }: { children: React.ReactNode }) {
  const value = useTurnstile();
  return (
    <TurnstileContext.Provider value={value}>
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstileContext() {
  const ctx = useContext(TurnstileContext);
  if (!ctx) {
    throw new Error("useTurnstileContext must be used within TurnstileProvider");
  }
  return ctx;
}
