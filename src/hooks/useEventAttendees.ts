"use client";

import { useQuery } from "@tanstack/react-query";

export type EventAttendee = {
  user_id: string;
  name: string;
};

type AttendeesResponse = {
  attendees: EventAttendee[];
  count: number;
};

export function useEventAttendees(eventId?: string) {
  return useQuery({
    queryKey: ["event-attendees", eventId],
    queryFn: async (): Promise<AttendeesResponse> => {
      const res = await fetch(`/api/events/attendees?event_id=${eventId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load attendees");
      }
      return data as AttendeesResponse;
    },
    enabled: Boolean(eventId),
  });
}
