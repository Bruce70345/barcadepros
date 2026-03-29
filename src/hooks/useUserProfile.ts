"use client";

import { useQuery } from "@tanstack/react-query";
import { barcadeApi } from "@/api/barcadeApi";
import { queryKeys } from "@/api/queryKeys";

export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.user.profile(userId) : ["user", "profile"],
    queryFn: () => {
      if (!userId) {
        throw new Error("userId is required");
      }
      return barcadeApi.getUserById(userId);
    },
    enabled: Boolean(userId),
  });
}
