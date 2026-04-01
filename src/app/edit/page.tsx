"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTurnstileContext } from "@/components/turnstileContext";
import { useUpdateUserName } from "@/hooks/useUpdateUserName";
import { useUpdateUserPreferences } from "@/hooks/useUpdateUserPreferences";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useGlobalContext } from "@/components/globalContext";
import { ApiError } from "@/api/apiClient";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function EditPage() {
  const router = useRouter();
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("userId");
  });
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [receiveRealtimeDraft, setReceiveRealtimeDraft] = useState<
    boolean | null
  >(null);
  const [receiveDigestDraft, setReceiveDigestDraft] = useState<boolean | null>(
    null,
  );
  const profileQuery = useUserProfile(userId);
  const updatePreferences = useUpdateUserPreferences();
  const updateName = useUpdateUserName();
  const { token, verified } = useTurnstileContext();
  const { SystemToast, SystemLoading } = useGlobalContext();
  const prevFetching = useRef<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      router.replace("/join");
    }
  }, [router, userId]);

  useEffect(() => {
    if (!userId) return;
    if (!profileQuery.isError) return;
    const error = profileQuery.error;
    const status =
      error instanceof ApiError
        ? error.status
        : typeof (error as any)?.status === "number"
          ? (error as any).status
          : null;
    if (status === 404) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("userId");
        window.localStorage.removeItem("userName");
      }
      router.replace("/join");
    }
  }, [profileQuery.isError, profileQuery.error, router, userId]);

  useEffect(() => {
    if (prevFetching.current === profileQuery.isFetching) return;
    prevFetching.current = profileQuery.isFetching;
    if (profileQuery.isFetching) {
      SystemLoading.loadingStart({ loadingText: "Syncing preferences..." });
    } else {
      SystemLoading.loadingEnd();
    }
  }, [SystemLoading, profileQuery.isFetching]);

  const isProfileReady = Boolean(profileQuery.data);
  const name = nameDraft ?? profileQuery.data?.name ?? "";
  const receiveRealtime =
    receiveRealtimeDraft ?? Boolean(profileQuery.data?.receive_realtime);
  const receiveDigest =
    receiveDigestDraft ?? Boolean(profileQuery.data?.receive_digest);

  const handleSavePreferences = async () => {
    if (!userId) return;
    if (!verified || !token) {
      SystemToast.showToast("Verification required before saving.", "warning");
      return;
    }
    try {
      SystemLoading.loadingStart({ loadingText: "Saving preferences..." });
      await updatePreferences.mutateAsync({
        userId,
        receiveRealtime,
        receiveDigest,
        turnstileToken: token,
      });
      SystemToast.showToast("Notification preferences updated.", "success");
    } catch (err) {
      SystemToast.showToast(
        err instanceof Error
          ? err.message
          : "Failed to update preferences.",
        "error",
      );
    } finally {
      SystemLoading.loadingEnd();
    }
  };

  const handleSaveName = async () => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      SystemToast.showToast("Please enter a display name.", "warning");
      return;
    }
    if (trimmed.length > 50) {
      SystemToast.showToast(
        "Display name must be under 50 characters.",
        "warning",
      );
      return;
    }
    if (!verified || !token) {
      SystemToast.showToast("Verification required before saving.", "warning");
      return;
    }
    try {
      SystemLoading.loadingStart({ loadingText: "Saving name..." });
      await updateName.mutateAsync({
        userId,
        name: trimmed,
        turnstileToken: token,
      });
      window.localStorage.setItem("userName", trimmed);
      SystemToast.showToast("Display name updated.", "success");
    } catch (err) {
      SystemToast.showToast(
        err instanceof Error ? err.message : "Failed to update name.",
        "error",
      );
    } finally {
      SystemLoading.loadingEnd();
    }
  };

  return (
    <main className="flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-8 pb-28">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Manage notifications and update your profile.
          </p>
          {profileQuery.error && (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Failed to load your settings."}
            </p>
          )}
        </header>

        <section className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Event notifications</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Realtime alerts include the event creator.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
                <span>
                  <span className="text-sm font-medium">Realtime push</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Notify immediately when events are created.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={isProfileReady ? receiveRealtime : false}
                  disabled={!isProfileReady}
                  onChange={(event) =>
                    setReceiveRealtimeDraft(event.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
                <span>
                  <span className="text-sm font-medium">Daily digest</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Summary of events in the next 72 hours.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--primary)]"
                  checked={isProfileReady ? receiveDigest : false}
                  disabled={!isProfileReady}
                  onChange={(event) =>
                    setReceiveDigestDraft(event.target.checked)
                  }
                />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--text-muted)]">
              Quiet hours: 22:00-08:00 (Asia/Taipei). Digest sends at 10:30
              daily.
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="mt-4 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-60"
              disabled={updatePreferences.isPending}
            >
              Save preferences
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-semibold">Profile</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              This name appears on events you create.
            </p>

            <label className="mt-4 block text-sm">
              Display name
              <input
                value={name}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Update your name"
                disabled={!isProfileReady}
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveName}
              className="mt-4 w-full rounded-lg border border-[color-mix(in oklab, var(--primary) 40%, var(--border))] bg-[color-mix(in oklab, var(--primary) 18%, var(--surface-2))] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[color-mix(in oklab, var(--primary) 26%, var(--surface-2))] disabled:opacity-60"
              disabled={updateName.isPending}
            >
              Save name
            </button>
          </div>

        </section>

      </div>
    </main>
  );
}
