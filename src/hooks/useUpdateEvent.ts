"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsQueryKey } from "@/hooks/useEvents";

type UpdateEventInput = {
  id: string;
  user_id: string;
  title?: string;
  category?: string;
  description?: string;
  start_at?: string;
  send_realtime?: boolean;
  recurrence_rule?: string;
  turnstile_token: string;
};

type UpdateEventResponse = { ok: true };

export function useUpdateEvent(range: { from: string; to: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateEventInput): Promise<UpdateEventResponse> => {
      const res = await fetch(`/api/events/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: payload.user_id,
          title: payload.title,
          category: payload.category,
          description: payload.description,
          start_at: payload.start_at,
          send_realtime: payload.send_realtime,
          recurrence_rule: payload.recurrence_rule,
          turnstile_token: payload.turnstile_token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update event");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(range) });
    },
  });
}
