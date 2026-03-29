"use client";

import dynamic from "next/dynamic";

const NotificationBell = dynamic(
  () => import("@/components/NotificationBell"),
  { ssr: false, loading: () => null },
);

export default function NotificationBellLazy() {
  return <NotificationBell />;
}
