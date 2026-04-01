"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

type UpdateAttendanceInput = {
  event_id: string;
  user_id: string;
  join: boolean;
};

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateAttendanceInput) => {
      const res = await fetch("/api/events/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update attendance");
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-attendees", variables.event_id],
      });
    },
  });
}
