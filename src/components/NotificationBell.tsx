"use client";

import { IconButton } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useFirebase } from "@/hooks/useFirebase";

export default function NotificationBell() {
  const { notificationPermission, requestPermission, isClient } =
    useFirebase() as {
      notificationPermission: NotificationPermission | "-";
      requestPermission: () => Promise<boolean>;
      isClient: boolean;
    };

  if (!isClient) return null;

  const enabled = notificationPermission === "granted";
  const blocked = notificationPermission === "denied";

  const handleClick = () => {
    if (!enabled && !blocked) {
      void requestPermission();
    }
  };

  return (
    <IconButton
      onClick={handleClick}
      size="medium"
      aria-label={enabled ? "Notifications enabled" : "Enable notifications"}
      className="!rounded-full !h-8 !w-8"
      sx={{
        bgcolor:
          !enabled || blocked
            ? "color-mix(in oklab, var(--danger) 35%, transparent)"
            : "var(--surface)",
        color: "var(--text-primary)",
        "&:hover": {
          bgcolor:
            !enabled || blocked
              ? "color-mix(in oklab, var(--danger) 55%, transparent)"
              : "var(--surface-2)",
        },
      }}
    >
      {enabled ? (
        <NotificationsIcon fontSize="inherit" />
      ) : (
        <NotificationsOffIcon fontSize="inherit" />
      )}
    </IconButton>
  );
}
