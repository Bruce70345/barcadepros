"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Hash, Home, Music, Notebook, Plus } from "lucide-react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useTurnstileContext } from "@/components/turnstileContext";
import {
  OPEN_EVENT_MODAL_EVENT,
  SHOW_CALENDAR_VIEW_EVENT,
  SHOW_LIST_VIEW_EVENT,
} from "@/lib/uiEvents";

export default function FloatingActionBar() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { handleVerify, handleError, handleExpire, setWidgetId } =
    useTurnstileContext();
  const pathname = usePathname();
  const router = useRouter();
  const handleAddEvent = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_EVENT_MODAL_EVENT));
  }, []);
  const handleShowList = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(SHOW_LIST_VIEW_EVENT));
  }, []);
  const handleShowCalendar = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(SHOW_CALENDAR_VIEW_EVENT));
  }, []);

  if (pathname === "/join") return null;

  const isEditPage = pathname === "/edit";
  const isBingoPage = pathname === "/bingo";
  const isHomeOnlyPage = isEditPage || isBingoPage;

  return (
    <div className="fixed inset-x-0 bottom-6 mx-auto w-full max-w-md px-5">
      <div className="rounded-full border border-[var(--border)] bg-[color-mix(in oklab, var(--surface) 88%, transparent)] px-3 py-2 shadow-lg shadow-[color-mix(in oklab, var(--background) 60%, transparent)] backdrop-blur">
        <div className="flex items-center justify-between">
          <audio ref={audioRef} src="/ringTone.mp3" preload="none" />
          <button
            type="button"
            aria-label="Open music"
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              audio.currentTime = 0;
              void audio.play();
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            <Music size={20} />
          </button>

          <button
            type="button"
            aria-label={isHomeOnlyPage ? "Go to home" : "Add event"}
            onClick={() => {
              if (isHomeOnlyPage) {
                router.push("/");
                return;
              }
              handleAddEvent();
            }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--primary) 70%, var(--border))] bg-[var(--primary)] text-[var(--background)] shadow-md shadow-[color-mix(in oklab, var(--primary) 35%, transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            {isHomeOnlyPage ? <Home size={24} /> : <Plus size={24} />}
          </button>
          {!isHomeOnlyPage && (
            <>
              <button
                type="button"
                aria-label={isBingoPage ? "Go to home" : "Go to bingo"}
                onClick={() => router.push(isBingoPage ? "/" : "/bingo")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                {isBingoPage ? <Home size={20} /> : <Hash size={20} />}
              </button>
              <button
                type="button"
                aria-label="Show calendar view"
                onClick={handleShowCalendar}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                <Calendar size={20} />
              </button>
              <button
                type="button"
                aria-label="Show list view"
                onClick={handleShowList}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                <Notebook size={20} />
              </button>
            </>
          )}
        </div>
      </div>
      <TurnstileWidget
        className="pt-1"
        onVerify={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        onWidgetId={setWidgetId}
      />
    </div>
  );
}
