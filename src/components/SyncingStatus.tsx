"use client";

import { Spinner } from "@/components/ui/spinner";

export default function SyncingStatus({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <Spinner size="sm" className="text-[var(--text-muted)]" />
      Syncing...
    </span>
  );
}
