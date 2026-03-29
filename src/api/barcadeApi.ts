import { postJson } from "@/api/apiClient";

type JoinUserResponse = {
  id: string;
  name: string;
};

export const barcadeApi = {
  joinUser: async (input: { name: string; turnstileToken: string }) => {
    return postJson<JoinUserResponse>("/api/users/upsert", {
      name: input.name,
      turnstile_token: input.turnstileToken,
    });
  },
};
