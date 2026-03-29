"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInitFcm } from "@/hooks/useInitFcm";
import { Calendar, Music, Plus } from "lucide-react";
import EventCard, { EventCardValues } from "@/components/EventCard";
import { useEvents } from "@/hooks/useEvents";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import TurnstileWidget from "@/components/TurnstileWidget";
import { useTurnstile } from "@/hooks/useTurnstile";
import { useGlobalContext } from "@/components/globalContext";
import ModalShell from "@/components/ModalShell";
import { useIsHydrated } from "@/hooks/useIsHydrated";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function MainPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("userId");
  });
  const range = useMemo(() => {
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);
  const eventsQuery = useEvents(range);
  const createEvent = useCreateEvent(range);
  const updateEvent = useUpdateEvent(range);
  const { token, verified, handleVerify, handleError, handleExpire } =
    useTurnstile();
  const { SystemToast, SystemLoading } = useGlobalContext();
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const prevFetching = useRef<boolean | null>(null);
  const hydrated = useIsHydrated();

  const toWeeklyRule = (startAt: string, isWeekly: boolean) => {
    if (!isWeekly) return "";
    const date = new Date(startAt);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDay();
    const map = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
    return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${map[day]}`;
  };

  useEffect(() => {
    if (!userId) {
      router.replace("/join");
    }
  }, [router, userId]);

  useInitFcm(true);

  useEffect(() => {
    if (createEvent.isPending || updateEvent.isPending) return;
    if (prevFetching.current === eventsQuery.isFetching) return;
    prevFetching.current = eventsQuery.isFetching;
    if (eventsQuery.isFetching) {
      SystemLoading.loadingStart({ loadingText: "Loading events..." });
    } else {
      SystemLoading.loadingEnd();
    }
  }, [
    SystemLoading,
    eventsQuery.isFetching,
    createEvent.isPending,
    updateEvent.isPending,
  ]);

  return (
    <main className="flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-8">

        {hydrated && eventsQuery.error && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
            {eventsQuery.error instanceof Error
              ? eventsQuery.error.message
              : "Failed to load events."}
          </div>
        )}

        <div className="space-y-4">
          {hydrated &&
            eventsQuery.data?.map((event) => (
              <EventCard
                key={event.id}
                mode="edit"
                initial={event}
                saving={updateEvent.isPending}
                onSave={async (values, id) => {
                  if (!userId || !id) return;
                  if (!verified || !token) {
                    SystemToast.showToast(
                      "Verification required before saving.",
                      "warning",
                    );
                    return;
                  }
              if (!values.title || !values.startAt) {
                SystemToast.showToast(
                  "Title and start time are required.",
                  "warning",
                );
                return;
              }
              const startDate = new Date(values.startAt);
              if (Number.isNaN(startDate.getTime())) {
                SystemToast.showToast("Start time is invalid.", "warning");
                return;
              }
              const startIso = startDate.toISOString();
                  const recurrenceRule = toWeeklyRule(
                    values.startAt,
                    values.isWeekly,
                  );
                  SystemLoading.loadingStart({ loadingText: "Updating event..." });
                  try {
                    await updateEvent.mutateAsync({
                      id,
                      user_id: userId,
                      title: values.title,
                      category: values.category || undefined,
                      description: values.description || undefined,
                      start_at: startIso,
                      send_realtime: values.sendRealtime,
                      recurrence_rule: recurrenceRule,
                      turnstile_token: token,
                    });
                    SystemToast.showToast("Event updated.", "success");
                  } catch (error) {
                    SystemToast.showToast(
                      error instanceof Error
                        ? error.message
                        : "Failed to update event.",
                      "error",
                    );
                  } finally {
                    SystemLoading.loadingEnd();
                  }
                }}
              />
            ))}
        </div>

        {/* Tabs (SPA)
            tab1: Calendar view (monthly) + List view (day)
            tab2: All events
              - filter: only mine
              - default: hide past events
        */}

        {/* Tab1 Content
            - Calendar monthly grid
            - Day list view (events for selected date)
        */}

        {/* Tab2 Content
            - All events list
            - Filter controls (mine only, show past)
        */}

        {/* Floating Add Event Button (bottom)
            - opens Event Editor modal
        */}

        {/* Event Editor Modal
            - Create + Update in one modal
            - fields: title, date/time, category, description, realtime toggle, recurrence
        */}
      </div>

      <div className="fixed inset-x-0 bottom-6 mx-auto w-full max-w-md px-5">
        <div className="rounded-full border border-[var(--border)] bg-[color-mix(in oklab, var(--surface) 88%, transparent)] px-3 py-2 shadow-lg shadow-[color-mix(in oklab, var(--background) 60%, transparent)] backdrop-blur">
          <div className="flex items-center justify-between">
            <TurnstileWidget
              className="hidden"
              onVerify={handleVerify}
              onError={handleError}
              onExpire={handleExpire}
            />
            <audio ref={audioRef} src="/ringTone.mp3" preload="none" />
            <button
              type="button"
              aria-label="Open calendar"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--border) 70%, transparent)] bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              <Calendar size={20} />
            </button>

            <button
              type="button"
              aria-label="Add event"
              onClick={() => setEventModalOpen(true)}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in oklab, var(--primary) 70%, var(--border))] bg-[var(--primary)] text-[var(--background)] shadow-md shadow-[color-mix(in oklab, var(--primary) 35%, transparent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              <Plus size={24} />
            </button>

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
          </div>
        </div>
      </div>

      <ModalShell
        open={eventModalOpen}
        title=""
        description=""
        onClose={() => setEventModalOpen(false)}
      >
        <EventCard
          mode="create"
          saving={createEvent.isPending}
          onSave={async (values: EventCardValues) => {
            if (!userId) return;
            if (!verified || !token) {
              SystemToast.showToast(
                "Verification required before saving.",
                "warning",
              );
              return;
            }
            if (!values.title || !values.startAt) {
              SystemToast.showToast(
                "Title and start time are required.",
                "warning",
              );
              return;
            }
            const startDate = new Date(values.startAt);
            if (Number.isNaN(startDate.getTime())) {
              SystemToast.showToast("Start time is invalid.", "warning");
              return;
            }
            const startIso = startDate.toISOString();
            const recurrenceRule = toWeeklyRule(values.startAt, values.isWeekly);
            SystemLoading.loadingStart({ loadingText: "Adding event..." });
            try {
              await createEvent.mutateAsync({
                user_id: userId,
                title: values.title,
                category: values.category || undefined,
                description: values.description || undefined,
                start_at: startIso,
                send_realtime: values.sendRealtime,
                recurrence_rule: recurrenceRule || undefined,
                turnstile_token: token,
              });
              setEventModalOpen(false);
              SystemToast.showToast("Event created.", "success");
            } catch (error) {
              SystemToast.showToast(
                error instanceof Error
                  ? error.message
                  : "Failed to create event.",
                "error",
              );
            } finally {
              SystemLoading.loadingEnd();
            }
          }}
        />
      </ModalShell>
    </main>
  );
}
