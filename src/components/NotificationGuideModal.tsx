"use client";

import { useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";

interface NotificationGuideModalProps {
  open: boolean;
  onClose: () => void;
}

const NotificationGuideModal = ({
  open,
  onClose,
}: NotificationGuideModalProps) => {
  const initialTab = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const isPWAMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isPWAMode) return 0;
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("edge")) return 4;
    if (userAgent.includes("firefox")) return 2;
    if (userAgent.includes("safari") && !userAgent.includes("chrome")) return 3;
    return 1;
  }, []);
  const [tabValue, setTabValue] = useState(initialTab);

  const tabs = [
    { id: "pwa", label: "PWA App" },
    { id: "chrome", label: "Chrome" },
    { id: "firefox", label: "Firefox" },
    { id: "safari", label: "Safari" },
    { id: "edge", label: "Edge" },
  ];

  // 根據設備類型顯示不同的 PWA 指南
  const renderPWAGuide = () => {
    const isIOS =
      typeof window !== "undefined" &&
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Enable Notifications for PWA App
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {`If you've installed our app to your home screen, you can enable
          notifications through your device settings:`}
          </p>
        </div>
        {isIOS ? (
          // iOS 設備指南
          (<div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              For iOS devices:
            </div>
            <ol className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>1. Go to your device Settings.</li>
              <li>2. Scroll down and tap on our app name.</li>
              <li>3. Find “Notifications” and tap on it.</li>
              <li>4. Toggle “Allow Notifications” to enable them.</li>
            </ol>
          </div>)
        ) : (
          // Android 設備指南
          (<div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              For Android devices:
            </div>
            <ol className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>1. Go to your device Settings.</li>
              <li>2. Tap on “Apps” or “Applications”.</li>
              <li>3. Find and tap on our app.</li>
              <li>4. Tap on “Permissions” or “Notifications”.</li>
              <li>5. Enable notifications for the app.</li>
            </ol>
          </div>)
        )}
        <p className="text-xs text-[var(--text-muted)]">
          Note: After enabling notifications in your device settings, you may
          need to restart the app for the changes to take effect.
        </p>
      </div>
    );
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="How to Enable Notifications"
      description="Follow the steps below based on your browser."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div
          role="tablist"
          aria-label="Browser tabs"
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {tabs.map((tab, index) => {
            const active = index === tabValue;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                aria-controls={`browser-tabpanel-${index}`}
                id={`browser-tab-${index}`}
                type="button"
                onClick={() => setTabValue(index)}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-[var(--primary)] bg-[color-mix(in oklab, var(--primary) 18%, var(--surface-2))] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-[var(--text-secondary)]">
          {tabValue === 0 && renderPWAGuide()}

          {tabValue === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Enable Notifications in Chrome
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Please follow the steps below:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>1. Click the lock icon 🔒 in the address bar.</li>
                <li>2. Find “Notifications” or “Site Settings”.</li>
                <li>3. Change the setting from “Block” to “Allow”.</li>
                <li>4. Refresh the page to apply the new settings.</li>
              </ol>
            </div>
          )}

          {tabValue === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Enable Notifications in Firefox
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Please follow the steps below:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>1. Click the lock or info icon (i) in the address bar.</li>
                <li>2. Find “Notifications” permission settings.</li>
                <li>3. Change the setting from “Block” to “Allow”.</li>
                <li>4. Refresh the page to apply the new settings.</li>
              </ol>
            </div>
          )}

          {tabValue === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Enable Notifications in Safari
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Please follow the steps below:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>
                  1. Click “Safari” in the menu bar and select “Preferences”.
                </li>
                <li>2. Select the “Websites” tab.</li>
                <li>3. Select “Notifications” from the left menu.</li>
                <li>
                  4. Find this website and change the setting to “Allow”.
                </li>
                <li>5. Refresh the page to apply the new settings.</li>
              </ol>
            </div>
          )}

          {tabValue === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Enable Notifications in Edge
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Please follow the steps below:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li>1. Click the lock icon 🔒 in the address bar.</li>
                <li>2. Find “Notifications” or “Site permissions”.</li>
                <li>3. Change the setting from “Block” to “Allow”.</li>
                <li>4. Refresh the page to apply the new settings.</li>
              </ol>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              Note
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              If you still cannot receive notifications after enabling them,
              make sure system notifications are turned on and your browser is
              not in “Do Not Disturb” or “Focus” mode.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)]"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
};

export default NotificationGuideModal;
