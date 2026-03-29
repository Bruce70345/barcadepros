"use client";

import { useMutation } from "@tanstack/react-query";
import { barcadeApi } from "@/api/barcadeApi";
import { queryKeys } from "@/api/queryKeys";

type UpdateNameInput = {
  userId: string;
  name: string;
  turnstileToken: string;
};

export function useUpdateUserName() {
  return useMutation<{ ok: true }, Error, UpdateNameInput>({
    mutationKey: queryKeys.user.profile("mutation"),
    mutationFn: (input) => barcadeApi.updateUserName(input),
  });
}
