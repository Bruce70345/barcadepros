export const queryKeys = {
  user: {
    join: ["user", "join"] as const,
    profile: (userId: string) => ["user", "profile", userId] as const,
    preferences: (userId: string) => ["user", "preferences", userId] as const,
  },
};
