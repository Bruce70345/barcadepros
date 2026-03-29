"use client";

import { useMutation } from "@tanstack/react-query";
import { barcadeApi } from "@/api/barcadeApi";
import { queryKeys } from "@/api/queryKeys";

type UpdatePreferencesInput = {
  userId: string;
  receiveRealtime?: boolean;
  receiveDigest?: boolean;
  turnstileToken?: string;
};

export function useUpdateUserPreferences() {
  return useMutation<{ ok: true }, Error, UpdatePreferencesInput>({
    mutationKey: queryKeys.user.preferences("mutation"),
    mutationFn: (input) => barcadeApi.updateUserPreferences(input),
  });
}
