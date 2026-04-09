"use client";

import { useMemo, useState } from "react";

export type BingoCell = {
  prompt: string;
  marked: boolean;
};

const SIZE = 4;
const STORAGE_CARD_KEY = "barcadepros:bingo:card:v1";

const shuffle = <T,>(items: readonly T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const isValidCard = (value: unknown): value is BingoCell[][] => {
  if (!Array.isArray(value) || value.length !== SIZE) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== SIZE) return false;
    for (const cell of row) {
      if (
        !cell ||
        typeof (cell as any).prompt !== "string" ||
        typeof (cell as any).marked !== "boolean"
      ) {
        return false;
      }
    }
  }
  return true;
};

const loadStoredCard = (prompts: readonly string[]) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_CARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidCard(parsed)) return null;
    const promptSet = new Set(prompts.map((p) => p.trim()));
    const allKnown = parsed.every((row) =>
      row.every((cell) => promptSet.has(cell.prompt.trim()) || cell.prompt.trim() === "—"),
    );
    if (!allKnown) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistCard = (card: BingoCell[][]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_CARD_KEY, JSON.stringify(card));
  } catch {
    // ignore storage failures
  }
};

const buildPromptCard = (prompts: readonly string[]): BingoCell[][] => {
  const clean = prompts.map((p) => p.trim()).filter(Boolean);
  const needed = SIZE * SIZE;
  const selected = shuffle(clean).slice(0, needed);
  const filled =
    selected.length >= needed
      ? selected
      : [...selected, ...Array.from({ length: needed - selected.length }, () => "—")];

  return Array.from({ length: SIZE }, (_, rowIndex) =>
    Array.from({ length: SIZE }, (_, colIndex) => {
      const idx = rowIndex * SIZE + colIndex;
      return { prompt: filled[idx] ?? "—", marked: false } satisfies BingoCell;
    }),
  );
};

const countBingos = (grid: BingoCell[][]) => {
  const isMarked = (row: number, col: number) => Boolean(grid[row]?.[col]?.marked);
  const idx = Array.from({ length: SIZE }, (_, i) => i);

  let total = 0;
  for (let row = 0; row < SIZE; row += 1) {
    if (idx.every((col) => isMarked(row, col))) total += 1;
  }
  for (let col = 0; col < SIZE; col += 1) {
    if (idx.every((row) => isMarked(row, col))) total += 1;
  }
  if (idx.every((i) => isMarked(i, i))) total += 1;
  if (idx.every((i) => isMarked(i, SIZE - 1 - i))) total += 1;
  return total;
};

export function useBingoGame(prompts: readonly string[]) {
  const [card, setCard] = useState<BingoCell[][]>(() => {
    const stored = loadStoredCard(prompts);
    if (stored) return stored;
    const next = buildPromptCard(prompts);
    persistCard(next);
    return next;
  });

  const [pendingPick, setPendingPick] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const bingos = useMemo(() => countBingos(card), [card]);

  const pendingPrompt =
    pendingPick ? card[pendingPick.row]?.[pendingPick.col]?.prompt ?? "" : "";

  const newCard = () => {
    setCard(() => {
      const next = buildPromptCard(prompts);
      persistCard(next);
      return next;
    });
  };

  const clearMarks = () => {
    setCard((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell, marked: false })));
      persistCard(next);
      return next;
    });
  };

  const openPickModal = (row: number, col: number) => {
    const cell = card[row]?.[col];
    if (!cell) return;
    setPendingPick({ row, col });
  };

  const cancelPick = () => setPendingPick(null);

  const confirmDone = () => {
    if (!pendingPick) return;
    const { row, col } = pendingPick;
    setCard((prev) => {
      const cell = prev[row]?.[col];
      if (!cell) return prev;
      if (cell.marked) return prev;
      const next = prev.map((r) => r.map((c) => ({ ...c })));
      next[row][col].marked = true;
      persistCard(next);
      return next;
    });
    setPendingPick(null);
  };

  return {
    card,
    bingos,
    pendingPick,
    pendingPrompt,
    newCard,
    clearMarks,
    openPickModal,
    cancelPick,
    confirmDone,
  };
}

