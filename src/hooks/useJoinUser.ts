"use client";

import { useMutation } from "@tanstack/react-query";
import { barcadeApi } from "@/api/barcadeApi";
import { queryKeys } from "@/api/queryKeys";

type JoinInput = {
  name: string;
  email?: string;
  turnstileToken: string;
};

type JoinResponse = {
  id: string;
  name: string;
};

export function useJoinUser() {
  return useMutation<JoinResponse, Error, JoinInput>({
    mutationKey: queryKeys.user.join,
    mutationFn: (input) => barcadeApi.joinUser(input),
  });
}
