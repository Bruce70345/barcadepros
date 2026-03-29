"use client";

import { useQuery } from "@tanstack/react-query";

export type EventRecord = {
  id: string;
  title: string;
  category?: string;
  description?: string;
  start_at: string;
  send_realtime: boolean;
  recurrence_rule?: string;
};

type Range = { from: string; to: string };

const fetchEvents = async (range: Range): Promise<EventRecord[]> => {
  const search = new URLSearchParams({
    from: range.from,
    to: range.to,
  });
  const res = await fetch(`/api/events?${search.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Failed to load events");
  }
  return res.json();
};

export const eventsQueryKey = (range: Range) => ["events", range] as const;

export function useEvents(range: Range) {
  return useQuery({
    queryKey: eventsQueryKey(range),
    queryFn: () => fetchEvents(range),
  });
}
