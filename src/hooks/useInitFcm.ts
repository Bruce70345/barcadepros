"use client";

import { useEffect } from "react";
import {
  ensureMessagingServiceWorker,
  initializeFirebase,
  initializeMessaging,
} from "@/utils/firebase";

export function useInitFcm(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const run = async () => {
      const firebaseApp = initializeFirebase();
      if (!firebaseApp) return;

      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      await ensureMessagingServiceWorker();
      await initializeMessaging(firebaseApp);
      if (!active) return;
    };

    void run();
    return () => {
      active = false;
    };
  }, [enabled]);
}
