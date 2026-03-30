"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

type DeleteEventInput = {
  id: string;
  user_id: string;
  turnstile_token: string;
  series_action?: "single" | "rest";
};

type DeleteEventResponse = { ok: true };

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DeleteEventInput): Promise<DeleteEventResponse> => {
      const res = await fetch(`/api/events/${payload.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: payload.user_id,
          turnstile_token: payload.turnstile_token,
          series_action: payload.series_action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete event");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
