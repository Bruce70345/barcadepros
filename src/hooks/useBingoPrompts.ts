"use client";

import { useEffect, useMemo } from "react";
import { useIsHydrated } from "@/hooks/useIsHydrated";

const STORAGE_PROMPTS_KEY = "barcadepros:bingo:prompts:v1";

const DEFAULT_BINGO_PROMPTS = [
  "Finish a drink before leaving the store",
  "Do rock-paper-scissors with someone outside the group — win to check it off",
  "Mix two drinks together and finish it",
  "Eat something from the hot food counter at one stop",
  "Do a dramatic slow-motion entrance into a 7-Eleven with dramatic music",
  "Have someone in the group draw something on your face",
  "Be the first person into the next three 7-Elevens in a row",
  "Take a selfie with a dog in a diaper",
  "Find someone to join the convenience run for atleast 2 stops",
  "CKS Memorial Hall: Run up the full staircase of the memorial hall without stopping",
  "Drink 3 sips while doing a handstand",
  "Cross a street in a somersault or wheel",
  "Partner Challenge: Get a drink for each other that you would never pick for yourself",
  "Start a Chinese conversation with a local for at least three sentences",
  "Play a game of Blik Butsen",
  "Buy a drink for someone you do not know yet",
  "Partner Challenge: finish a bottle of soju together",
  "Take a selfie with a police officer",
  "Convince a 7-Eleven cashier to recommend their favorite drink — then buy it",
  "Take a photo that makes it look like you’re holding Taipei 101 (visible from parts of the route)",
  "Shotgun a beer",
  "Balance a potatoe from one 7/11 to another (potetlöp) - first one gets a beer from knut",
  "Tape all the cans you drink into a beer staff",
  "Have a local make you a 7Eleven cocktail",
  "Recreate the obsessed reel (ask edgar)",
  "Take a video of you drinking on someone",
  "Photobomb someones picture",
  "Scare someone hard enough for them to make a noise",
] as const;

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

  const prompts = useMemo(() => {
    if (typeof window === "undefined") return [...DEFAULT_BINGO_PROMPTS];
    const stored = parseStoredPrompts(
      window.localStorage.getItem(STORAGE_PROMPTS_KEY),
    );
    return stored ?? [...DEFAULT_BINGO_PROMPTS];
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_PROMPTS_KEY, JSON.stringify(prompts));
    } catch {
      // ignore storage failures
    }
  }, [prompts]);

  return { prompts, isLoading: !hydrated };
}
