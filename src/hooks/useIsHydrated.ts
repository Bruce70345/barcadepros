"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

const hydrationStore = {
  value: false,
  listeners: new Set<Listener>(),
  subscribe(listener: Listener) {
    hydrationStore.listeners.add(listener);
    if (!hydrationStore.value && typeof window !== "undefined") {
      queueMicrotask(() => {
        if (hydrationStore.value) return;
        hydrationStore.value = true;
        hydrationStore.listeners.forEach((l) => l());
      });
    }
    return () => hydrationStore.listeners.delete(listener);
  },
  getSnapshot() {
    return hydrationStore.value;
  },
  getServerSnapshot() {
    return false;
  },
};

export function useIsHydrated() {
  return useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
}
