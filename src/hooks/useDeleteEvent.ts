"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsQueryKey } from "@/hooks/useEvents";

type DeleteEventInput = {
  id: string;
  user_id: string;
  turnstile_token: string;
};

type DeleteEventResponse = { ok: true };

export function useDeleteEvent(range: { from: string; to: string }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DeleteEventInput): Promise<DeleteEventResponse> => {
      const res = await fetch(`/api/events/${payload.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: payload.user_id,
          turnstile_token: payload.turnstile_token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete event");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey(range) });
    },
  });
}
