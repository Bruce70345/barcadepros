"use client";

import { useEffect, useMemo } from "react";
import ModalShell from "@/components/ModalShell";
import { useBingoPrompts } from "@/hooks/useBingoPrompts";
import { useBingoGame } from "@/hooks/useBingoGame";
import { useGlobalContext } from "@/components/globalContext";
import { useTurnstileContext } from "@/components/turnstileContext";

const previewPrompt = (prompt: string, maxChars: number) => {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
};

const hashPrompts = (prompts: readonly string[]) => {
  let hash = 5381;
  const joined = prompts.join("\n");
  for (let i = 0; i < joined.length; i += 1) {
    hash = ((hash << 5) + hash) ^ joined.charCodeAt(i);
  }
  return `p${prompts.length}-${(hash >>> 0).toString(16)}`;
};

function BingoBoard({ prompts }: { prompts: readonly string[] }) {
  const { token, verified } = useTurnstileContext();
  const userName =
    typeof window !== "undefined" ? window.localStorage.getItem("userName") || "" : "";
  const game = useBingoGame(prompts, {
    turnstileToken: token,
    verified,
    userName,
  });
  const isDev = process.env.NODE_ENV !== "production";
  const hasMarked = game.card.some((row) => row.some((cell) => cell.marked));

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bingo</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={hasMarked}
            onClick={game.newCard}
            className={[
              "rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              hasMarked
                ? "cursor-not-allowed bg-[var(--surface-2)] text-[var(--text-muted)] opacity-60"
                : "bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))]",
            ].join(" ")}
          >
            Shuffle
          </button>
          {isDev && (
            <button
              type="button"
              onClick={game.clearMarks}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <section className="mt-6 flex min-h-[70vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="grid flex-1 grid-cols-4 grid-rows-4 gap-3">
          {game.card.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const marked = Boolean(cell.marked);
              const label = previewPrompt(cell.prompt, 25);
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => game.openPickModal(rowIndex, colIndex)}
                  className={[
                    "h-full min-h-0 rounded-2xl border px-2 py-2 text-left text-xs font-semibold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                    marked
                      ? "border-[color-mix(in oklab, var(--primary) 70%, var(--border))] bg-[var(--primary)] text-[var(--background)]"
                      : "border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))]",
                    "cursor-pointer",
                  ].join(" ")}
                  aria-pressed={marked}
                  aria-label={cell.prompt}
                >
                  {label}
                </button>
              );
            }),
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Bingos</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {game.bingos}
          </span>
        </div>
      </section>

      <ModalShell
        open={Boolean(game.pendingPick)}
        title=""
        description=""
        onClose={game.cancelPick}
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-base font-semibold text-[var(--text-primary)]">
            Bingo
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
            {game.pendingPrompt}
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={game.cancelPick}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={game.requestDone}
              className="rounded-xl border border-[color-mix(in oklab, var(--primary) 70%, var(--border))] bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[color-mix(in oklab, var(--primary) 90%, black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Done
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={game.confirmDoneWarningOpen}
        title=""
        description=""
        onClose={game.cancelDoneWarning}
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-base font-semibold text-[var(--text-primary)]">
            This can’t be undone
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Marking this square as done can’t be undone. Please confirm you’ve actually completed the task before continuing.
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={game.cancelDoneWarning}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={game.confirmDoneWarning}
              className="rounded-xl border border-[color-mix(in oklab, var(--primary) 70%, var(--border))] bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[color-mix(in oklab, var(--primary) 90%, black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Confirm
            </button>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function BingoPageClient() {
  const { SystemLoading } = useGlobalContext();
  const { prompts, isLoading } = useBingoPrompts();
  const { loadingStart, loadingEnd } = SystemLoading;

  useEffect(() => {
    if (isLoading) {
      loadingStart({ loadingText: "Loading bingo..." });
    } else {
      loadingEnd();
    }
    return () => loadingEnd();
  }, [isLoading, loadingStart, loadingEnd]);

  const promptsKey = useMemo(() => hashPrompts(prompts), [prompts]);

  return (
    <main className="flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 pt-8 pb-[calc(9rem+env(safe-area-inset-bottom))]">
        {!isLoading && prompts.length > 0 && (
          <BingoBoard key={promptsKey} prompts={prompts} />
        )}
      </div>
    </main>
  );
}
