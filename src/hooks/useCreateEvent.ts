"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsQueryKey } from "@/hooks/useEvents";

type CreateEventInput = {
  user_id: string;
  title: string;
  category?: string;
  description?: string;
  start_at: string;
  send_realtime: boolean;
  recurrence_rule?: string;
  turnstile_token: string;
};

type CreateEventResponse = { id: string };

export function useCreateEvent(range: { from: string; to: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEventInput): Promise<CreateEventResponse> => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create event");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(range) });
    },
  });
}
