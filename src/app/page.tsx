"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInitFcm } from "@/hooks/useInitFcm";
import { ChevronDown } from "lucide-react";
import EventCard, { EventCardValues } from "@/components/EventCard";
import { useEvents, type EventRecord } from "@/hooks/useEvents";
import { useCreateEvent } from "@/hooks/useCreateEvent";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import { useDeleteEvent } from "@/hooks/useDeleteEvent";
import { useTurnstileContext } from "@/components/turnstileContext";
import { useGlobalContext } from "@/components/globalContext";
import ModalShell from "@/components/ModalShell";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useUserProfile } from "@/hooks/useUserProfile";
import NotificationGuideModal from "@/components/NotificationGuideModal";
import CalendarView from "@/components/CalendarView";
import {
  OPEN_EVENT_MODAL_EVENT,
  SHOW_CALENDAR_VIEW_EVENT,
  SHOW_LIST_VIEW_EVENT,
} from "@/lib/uiEvents";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function MainPage() {
  const router = useRouter();
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("userId");
  });
  const [hidePast, setHidePast] = useState(true);
  const [rangeFilter, setRangeFilter] = useState<"all" | "3d" | "7d">("7d");
  const [onlyMine, setOnlyMine] = useState(false);
  const range = useMemo(() => {
    const now = new Date();
    const from = hidePast ? now.toISOString() : new Date(0).toISOString();
    let to = new Date(Date.now() + 1000 * 365 * 24 * 60 * 60 * 1000).toISOString();
    if (rangeFilter === "3d") {
      to = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    } else if (rangeFilter === "7d") {
      to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    return { from, to };
  }, [hidePast, rangeFilter]);
  const eventsQuery = useEvents(range);
  const createEvent = useCreateEvent(range);
  const updateEvent = useUpdateEvent(range);
  const deleteEvent = useDeleteEvent(range);
  const { token, verified, reset } = useTurnstileContext();
  const { SystemToast, SystemLoading, SystemConfirm } = useGlobalContext();
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const prevFetching = useRef<boolean | null>(null);
  const hydrated = useIsHydrated();
  const profileQuery = useUserProfile(userId);
  const [showNotificationGuide, setShowNotificationGuide] = useState(false);

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

  useEffect(() => {
    const handler = () => setEventModalOpen(true);
    window.addEventListener(OPEN_EVENT_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT_MODAL_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = () => setActiveTab("list");
    window.addEventListener(SHOW_LIST_VIEW_EVENT, handler);
    return () => window.removeEventListener(SHOW_LIST_VIEW_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = () => setActiveTab("calendar");
    window.addEventListener(SHOW_CALENDAR_VIEW_EVENT, handler);
    return () => window.removeEventListener(SHOW_CALENDAR_VIEW_EVENT, handler);
  }, []);

  useInitFcm(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const dismissed = window.localStorage.getItem("notificationGuideDismissed");
    if (dismissed === "1") return;
    if (Notification.permission !== "granted") {
      setShowNotificationGuide(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
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
    userId,
  ]);

  const handleTestRealtime = async () => {
    if (!userId) return;
    if (!verified || !token) {
      SystemToast.showToast("Verification required before testing.", "warning");
      return;
    }
    SystemLoading.loadingStart({ loadingText: "Sending test notification..." });
    try {
      const now = new Date();
      const createRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title: `Test event ${now.toLocaleTimeString()}`,
          start_at: now.toISOString(),
          send_realtime: false,
          turnstile_token: token,
        }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(created?.message || "Failed to create test event");
      }
      const eventId = created?.id;
      if (!eventId) {
        throw new Error("Missing event id from create response");
      }

      const sendRes = await fetch("/api/notifications/send-realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          turnstile_token: token,
        }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        throw new Error(sendData?.message || "Failed to send realtime");
      }

      SystemToast.showToast("Test realtime sent.", "success");
    } catch (error) {
      SystemToast.showToast(
        error instanceof Error ? error.message : "Test failed.",
        "error",
      );
    } finally {
      SystemLoading.loadingEnd();
    }
  };

  const handleTestDigest = async () => {
    if (!verified || !token) {
      SystemToast.showToast("Verification required before testing.", "warning");
      return;
    }
    SystemLoading.loadingStart({ loadingText: "Sending digest test..." });
    try {
      const res = await fetch("/api/notifications/send-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstile_token: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to send digest");
      }
      SystemToast.showToast("Test digest sent.", "success");
    } catch (error) {
      SystemToast.showToast(
        error instanceof Error ? error.message : "Test failed.",
        "error",
      );
    } finally {
      SystemLoading.loadingEnd();
    }
  };

  return (
    <main className="flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-8 pb-28">

        {hydrated && eventsQuery.error && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
            {eventsQuery.error instanceof Error
              ? eventsQuery.error.message
              : "Failed to load events."}
          </div>
        )}

        {process.env.NODE_ENV !== "production" && (
          <div className="mb-4 grid gap-2">
            <button
              type="button"
              onClick={handleTestRealtime}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))]"
            >
              Send Test Realtime Notification
            </button>
            <button
              type="button"
              onClick={handleTestDigest}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))]"
            >
              Send Test Digest Notification
            </button>
          </div>
        )}

        {activeTab === "list" && (
          <>
            <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto_auto] items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                <span>
                  Hide past events
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    before now
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={hidePast}
                  onChange={(event) => setHidePast(event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                  className="h-5 w-5 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                />
                <ChevronDown className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div className="space-y-2">
                  <div className="text-xs text-[var(--text-muted)]">
                    Range (optional, choose one)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "7d", label: "Next 7 days" },
                      { id: "3d", label: "Next 3 days" },
                      { id: "all", label: "All events" },
                    ].map((option) => {
                      const active = rangeFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setRangeFilter(option.id as "all" | "3d" | "7d")
                          }
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            active
                              ? "border-[var(--primary)] bg-[color-mix(in oklab, var(--primary) 18%, var(--surface-2))] text-[var(--text-primary)]"
                              : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <span className="text-sm">
                    Only my events
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      created by you
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={onlyMine}
                    onChange={(event) => setOnlyMine(event.target.checked)}
                    className="h-5 w-5 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  />
                  <span className="h-4 w-4" aria-hidden="true" />
                </label>
              </div>
            </details>

            <div className="panel-with-scrollbar mt-6 max-h-[60vh] space-y-3 overflow-y-visible">
              {hydrated && eventsQuery.data?.length === 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  No events match these filters.
                </div>
              )}
              {hydrated &&
                eventsQuery.data
                  ?.filter((event) => {
                    if (onlyMine && userId && event.user_id !== userId) {
                      return false;
                    }
                    return true;
                  })
                  .map((event) => {
                  const canManage =
                    userId &&
                    (event.user_id === userId || profileQuery.data?.is_admin);
                  const when = new Date(event.start_at);
                  const timeLabel = Number.isNaN(when.getTime())
                    ? event.start_at
                    : when.toLocaleString();
                  return (
                <div
                  key={event.id}
                  className="cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  onClick={() => setEditingEvent(event)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {event.title}
                      </h3>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {timeLabel}
                          </p>
                      {event.category && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {event.category}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Inviter: {event.owner_name || "Unknown"}
                      </p>
                    </div>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!userId) return;
                                if (!verified || !token) {
                                  SystemToast.showToast(
                                    "Verification required before deleting.",
                                    "warning",
                                  );
                                  return;
                                }
                                SystemConfirm.showConfirm(
                                  "Delete event",
                                  "This action cannot be undone.",
                              async () => {
                                SystemLoading.loadingStart({
                                  loadingText: "Deleting event...",
                                });
                                try {
                                  await deleteEvent.mutateAsync({
                                    id: event.id,
                                    user_id: userId,
                                    turnstile_token: token,
                                  });
                                  SystemToast.showToast(
                                    "Event deleted.",
                                    "success",
                                  );
                                } catch (error) {
                                  SystemToast.showToast(
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to delete event.",
                                    "error",
                                  );
                                } finally {
                                  SystemLoading.loadingEnd();
                                  reset();
                                }
                              }
                            );
                          }}
                              className="rounded-full border border-[color-mix(in oklab, var(--danger) 40%, var(--border))] bg-[color-mix(in oklab, var(--danger) 16%, var(--surface-2))] px-3 py-1 text-xs text-[var(--danger)]"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
        {activeTab === "calendar" && (
          <CalendarView
            events={eventsQuery.data ?? []}
            onSelectEvent={(event) => setEditingEvent(event)}
          />
        )}

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
              reset();
            }
          }}
        />
      </ModalShell>

      <ModalShell
        open={Boolean(editingEvent)}
        title=""
        description=""
        onClose={() => setEditingEvent(null)}
      >
        {editingEvent && (() => {
          const canEdit =
            Boolean(userId) &&
            (editingEvent.user_id === userId ||
              Boolean(profileQuery.data?.is_admin));
          return (
            <EventCard
              mode="edit"
              readOnly={!canEdit}
              initial={editingEvent}
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
                  setEditingEvent(null);
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
                  reset();
                }
              }}
            />
          );
        })()}
      </ModalShell>

      <NotificationGuideModal
        open={showNotificationGuide}
        onClose={() => {
          setShowNotificationGuide(false);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("notificationGuideDismissed", "1");
          }
        }}
      />
    </main>
  );
}
