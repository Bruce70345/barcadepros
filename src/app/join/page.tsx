"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useJoinUser } from "@/hooks/useJoinUser";
import { useTurnstileContext } from "@/components/turnstileContext";
import { useGlobalContext } from "@/components/globalContext";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const joinUser = useJoinUser();
  const { token, verified, error } = useTurnstileContext();
  const { SystemToast, SystemLoading } = useGlobalContext();

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");
    if (userId) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (error) {
      console.error("Turnstile error:", error);
    }
  }, [error]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      SystemToast.showToast("Please enter a display name.", "warning");
      return;
    }
    if (trimmed.length > 50) {
      SystemToast.showToast("Display name must be under 50 characters.", "warning");
      return;
    }
    const surnameTrimmed = surname.trim();
    if (!surnameTrimmed) {
      SystemToast.showToast("Please enter a surname.", "warning");
      return;
    }
    if (!verified || !token) {
      console.warn("Turnstile verification missing.", { verified, token });
      SystemToast.showToast("Please complete the verification.", "warning");
      return;
    }

    try {
      SystemLoading.loadingStart({ loadingText: "Joining..." });
      const record = await joinUser.mutateAsync({
        name: trimmed,
        email: surnameTrimmed,
        turnstileToken: token,
      });
      window.localStorage.setItem("userId", record.id);
      window.localStorage.setItem("userName", record.name);
      router.replace("/");
    } catch (err) {
      console.error("Join failed:", err);
      SystemToast.showToast(
        err instanceof Error ? err.message : "Failed to join.",
        "error",
      );
    } finally {
      SystemLoading.loadingEnd();
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="text-2xl font-semibold">Join Barcade Pros</h1>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
          <Image
            src="/joinPic.jpeg"
            alt="Join Barcade Pros"
            width={960}
            height={640}
            className="h-auto w-full object-cover"
            sizes="(max-width: 768px) 100vw, 448px"
            priority
          />
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Enter your display name to get started.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-sm">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Luffy"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </label>
          <label className="block text-sm">
            Surname
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="e.g. Monkey"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-60"
            disabled={joinUser.isPending}
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
