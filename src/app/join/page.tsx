"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useJoinUser } from "@/hooks/useJoinUser";
import { useTurnstileContext } from "@/components/turnstileContext";
import { useGlobalContext } from "@/components/globalContext";
import TurnstileWidget from "@/components/TurnstileWidget";
import NotificationGuideModal from "@/components/NotificationGuideModal";
import ModalShell from "@/components/ModalShell";
import { useFirebase } from "@/hooks/useFirebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ApiError } from "@/api/apiClient";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventParam = searchParams?.get("event")?.trim() || "";
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const joinUser = useJoinUser();
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("userId");
  });
  const profileQuery = useUserProfile(userId);
  const { token, verified, error, handleVerify, handleError, handleExpire, setWidgetId } =
    useTurnstileContext();
  const { SystemToast, SystemLoading } = useGlobalContext();
  const { notificationPermission, requestPermission } = useFirebase() as {
    notificationPermission: NotificationPermission | "-";
    requestPermission: () => Promise<boolean>;
  };

  // useEffect(() => {
  //   if (!userId) return;
  //   if (profileQuery.data && !profileQuery.isError) {
  //     const target = eventParam ? `/?event=${encodeURIComponent(eventParam)}` : "/";
  //     router.replace(target);
  //     return;
  //   }
  //   if (!profileQuery.isError) return;
  //   const error = profileQuery.error;
  //   const status =
  //     error instanceof ApiError
  //       ? error.status
  //       : typeof (error as any)?.status === "number"
  //         ? (error as any).status
  //         : null;
  //   if (status === 404) {
  //     if (typeof window !== "undefined") {
  //       window.localStorage.removeItem("userId");
  //       window.localStorage.removeItem("userName");
  //     }
  //   }
  // }, [profileQuery.data, profileQuery.error, profileQuery.isError, router, userId]);

  useEffect(() => {
    if (error) {
      console.error("Turnstile error:", error);
    }
  }, [error]);

  const proceedJoin = async (trimmed: string, surnameTrimmed: string) => {
    if (!trimmed) {
      SystemToast.showToast("Please enter a display name.", "warning");
      return;
    }
    if (trimmed.length > 50) {
      SystemToast.showToast("Display name must be under 50 characters.", "warning");
      return;
    }
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
      const target = eventParam ? `/?event=${encodeURIComponent(eventParam)}` : "/";
      router.replace(target);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    const surnameTrimmed = surname.trim();
    if (
      notificationPermission === "denied" ||
      notificationPermission === "-" ||
      notificationPermission === "default"
    ) {
      if (notificationPermission === "denied") {
        setPendingSubmit(true);
        setShowPermissionModal(true);
        return;
      }
      const granted = await requestPermission();
      if (!granted) {
        setPendingSubmit(true);
        setShowPermissionModal(true);
        return;
      }
    }
    await proceedJoin(trimmed, surnameTrimmed);
  };

  return (
    <main className="flex-1 bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-4">
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
        <TurnstileWidget
          className="pt-1"
          onVerify={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          onWidgetId={setWidgetId}
        />
      </div>
      <ModalShell
        open={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        title="Enable Notifications"
        description="Please enable notifications before joining."
      >
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Notifications are required to receive event updates. Please allow
            notifications in your browser or device settings.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => {
                setShowPermissionModal(false);
                setShowGuide(true);
              }}
              className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)]"
            >
              View Guide
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPermissionModal(false);
                if (pendingSubmit) {
                  setPendingSubmit(false);
                  void proceedJoin(name.trim(), surname.trim());
                }
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
            >
              Not now
            </button>
          </div>
        </div>
      </ModalShell>
      <NotificationGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </main>
  );
}
