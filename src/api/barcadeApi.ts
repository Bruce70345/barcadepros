import { getJson, patchJson, postJson } from "@/api/apiClient";

type JoinUserResponse = {
  id: string;
  name: string;
};

type UserProfile = {
  id: string;
  name: string;
  receive_realtime: boolean;
  receive_digest: boolean;
  is_active: boolean;
  is_admin?: boolean;
};

export const barcadeApi = {
  joinUser: async (input: {
    name: string;
    email?: string;
    turnstileToken: string;
  }) => {
    return postJson<JoinUserResponse>("/api/users/upsert", {
      name: input.name,
      email: input.email,
      turnstile_token: input.turnstileToken,
    });
  },
  getUserById: async (userId: string) => {
    return getJson<UserProfile>(`/api/users/${userId}`);
  },
  updateUserPreferences: async (input: {
    userId: string;
    receiveRealtime?: boolean;
    receiveDigest?: boolean;
    turnstileToken?: string;
  }) => {
    return patchJson<{ ok: true }>("/api/users/preferences", {
      user_id: input.userId,
      receive_realtime: input.receiveRealtime,
      receive_digest: input.receiveDigest,
      turnstile_token: input.turnstileToken,
    });
  },
  updateUserName: async (input: {
    userId: string;
    name: string;
    turnstileToken: string;
  }) => {
    return patchJson<{ ok: true }>("/api/users/name", {
      user_id: input.userId,
      name: input.name,
      turnstile_token: input.turnstileToken,
    });
  },
};
