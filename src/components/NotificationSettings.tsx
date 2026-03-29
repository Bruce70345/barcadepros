"use client";

import { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import NotificationGuideModal from "@/components/NotificationGuideModal";
import { NotificationPermissionState, useFirebase } from "@/hooks/useFirebase";

const NotificationSettings = () => {
  const { notificationPermission, requestPermission, isClient } =
    useFirebase() as {
      notificationPermission: NotificationPermissionState;
      requestPermission: () => Promise<boolean>;
      isClient: boolean;
    };
  const [showGuide, setShowGuide] = useState(false);

  const notificationEnabled = notificationPermission === "granted";
  const notificationBlocked = notificationPermission === "denied";
  const permissionUnknown =
    notificationPermission === "-" || notificationPermission === "default";

  const handleButtonClick = () => {
    // 如果權限被拒絕，顯示幫助對話框
    if (notificationBlocked ) {
      setShowGuide(true);
      return;
    }

    // 如果權限未被授予且未被拒絕，請求權限
    if (!notificationEnabled || notificationPermission !== "granted") {
      requestPermission().then((granted: boolean) => {
        if (!granted) {
          // 如果請求被拒絕，顯示指南
          setShowGuide(true);
        }
      });
      return;
    }

    console.log(
      "Cannot disable notifications once granted. Please use browser settings."
    );
  };

  // 關閉幫助對話框
  const handleCloseGuide = () => {
    setShowGuide(false);
  };

  if (!isClient) return null;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip
          title={
            notificationBlocked
              ? "Notification blocked. Click for help"
              : notificationEnabled
              ? "Notification On"
              : "Enable Notification"
          }
        >
          <IconButton
            onClick={handleButtonClick}
            size="large"
            sx={{ color: "white" }}
            className={`${
              !notificationEnabled || notificationBlocked
                ? "!bg-red-500 !rounded-full !bg-opacity-40 hover:!bg-red-500 hover:!bg-opacity-60 animate-pulse"
                : "!bg-pamex-blue !rounded-full !bg-opacity-20 hover:!bg-pamex-blue hover:!bg-opacity-60"
            }`}
          >
            {notificationEnabled ? (
              <NotificationsIcon fontSize="small" />
            ) : (
              <NotificationsOffIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <span className="text-white text-sm">
          {notificationBlocked
            ? "Notification access is currently blocked. Click the bell icon to learn how to manage permissions."
            : notificationEnabled
            ? "Notification access is granted."
            : permissionUnknown
            ? "Notification is not enabled yet. Click the bell icon to enable."
            : "Notification access is currently denied. Click the bell icon to manage permissions."}
        </span>
      </Box>

      {/* 通知設定指南 Modal */}
      <NotificationGuideModal open={showGuide} onClose={handleCloseGuide} />
    </>
  );
};

export default NotificationSettings;
