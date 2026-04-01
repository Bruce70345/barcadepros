"use client";

import { IconButton } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { useState } from "react";
import NotificationGuideModal from "@/components/NotificationGuideModal";
import { useFirebase } from "@/hooks/useFirebase";

export default function NotificationBell() {
  const { notificationPermission, requestPermission, isClient } =
    useFirebase() as {
      notificationPermission: NotificationPermission | "-";
      requestPermission: () => Promise<boolean>;
      isClient: boolean;
    };
  const [showGuide, setShowGuide] = useState(false);

  if (!isClient) return null;

  const enabled = notificationPermission === "granted";
  const blocked = notificationPermission === "denied";

  const handleClick = () => {
    if (blocked) {
      setShowGuide(true);
      return;
    }
    if (!enabled) {
      void requestPermission().then((granted) => {
        if (!granted) setShowGuide(true);
      });
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="medium"
        aria-label={enabled ? "Notifications enabled" : "Enable notifications"}
        className="!rounded-full !h-11 !w-11"
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
      <NotificationGuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
}
