"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsHydrated } from "@/hooks/useIsHydrated";

const STORAGE_PROMPTS_KEY = "barcadepros:bingo:prompts:v1";


const parseStoredPrompts = (raw: string | null): string[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
};

export function useBingoPrompts() {
  const hydrated = useIsHydrated();

  const storedPrompts = useMemo(() => {
    if (!hydrated) return null;
    if (typeof window === "undefined") return null;
    const stored = parseStoredPrompts(
      window.localStorage.getItem(STORAGE_PROMPTS_KEY),
    );
    return stored;
  }, [hydrated]);

  const shouldFetch = hydrated && !storedPrompts;

  const query = useQuery({
    queryKey: ["bingoEvents"],
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const res = await fetch("/api/bingo-events", { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to fetch bingo events: ${res.status} ${text || res.statusText}`,
        );
      }
      const data = (await res.json()) as { events?: unknown };
      const events = Array.isArray(data.events)
        ? data.events
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      if (events.length === 0) {
        throw new Error("No bingo events returned from API.");
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_PROMPTS_KEY, JSON.stringify(events));
        } catch {
          // ignore storage failures
        }
      }

      return events;
    },
  });

  const prompts = storedPrompts ?? query.data ?? (query.isError ? [] : []);
  const isLoading = !hydrated || (shouldFetch && query.isFetching);

  return { prompts, isLoading };
}
