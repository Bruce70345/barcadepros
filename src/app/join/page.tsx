"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");
    if (userId) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    if (trimmed.length > 50) {
      setError("Display name must be under 50 characters.");
      return;
    }
    const userId = crypto.randomUUID();
    window.localStorage.setItem("userId", userId);
    window.localStorage.setItem("userName", trimmed);
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="text-2xl font-semibold">Join the Calendar</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Enter your display name to get started.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-sm">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jamie"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </label>

          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)]"
          >
            Continue
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Note: Others will see your name when you add events. You can change it
          later in settings.
        </p>
      </div>
    </main>
  );
}
