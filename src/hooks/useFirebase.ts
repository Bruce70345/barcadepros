"use client";
import {
  initializeAnalytics,
  initializeFirebase,
  initializeMessaging,
  requestNotificationPermission,
  showDirectNotification,
  showNotification,
} from "@/utils/firebase";
import { FirebaseApp } from "firebase/app";
import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationPermissionState = NotificationPermission | "-";

export function useFirebase() {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [messaging, setMessaging] = useState<any>(null);
  const [fcmToken, setFcmToken] = useState<string>("");
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>("-");
  const [isClient, setIsClient] = useState<boolean>(false);
  const isInitialized = useRef(false);

  // 初始化 Firebase 核心和分析
  useEffect(() => {
    // 標記為客戶端渲染
    setIsClient(true);

    if (isInitialized.current) return;

    try {
      const appInstance = initializeFirebase();
      if (appInstance) {
        setApp(appInstance);

        // 初始化分析
        const analyticsInstance = initializeAnalytics(appInstance);
        setAnalytics(analyticsInstance);

        console.log("[useFirebase] Firebase 核心和分析初始化成功");
        isInitialized.current = true;
      } else {
        console.error("[useFirebase] Firebase 初始化失敗");
      }
    } catch (error) {
      console.error("[useFirebase] Firebase 初始化錯誤:", error);
    }

    // 檢查通知權限
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      console.log("[useFirebase] 當前通知權限:", permission);

      // 設置通知權限監聽 (如果瀏覽器支援)
      if (navigator.permissions) {
        console.log("[useFirebase] 設置權限變更監聽");

        // 監聽權限變更
        navigator.permissions
          .query({ name: "notifications" })
          .then((permissionStatus) => {
            console.log("[useFirebase] 初始權限狀態:", permissionStatus.state);

            // 添加變更事件監聽器
            permissionStatus.onchange = async () => {
              console.log(
                "[useFirebase] 權限狀態變更:",
                permissionStatus.state,
              );
              setNotificationPermission(
                permissionStatus.state as NotificationPermission,
              );

              // 如果權限被授予，立即更新 FCM Token
              if (permissionStatus.state === "granted" && app) {
                console.log(
                  "[useFirebase] 通知權限通過 permissions API 變更為 granted",
                );

                try {
                  const { getFcmToken } = await import("@/utils/firebase");
                  const token = await getFcmToken();

                  if (token) {
                    setFcmToken(token);
                    console.log(
                      "[useFirebase] permissions API 權限變更後成功獲取 FCM Token",
                    );
                  }
                } catch (error) {
                  console.error(
                    "[useFirebase] permissions API 權限變更後獲取 FCM Token 失敗:",
                    error,
                  );
                }
              }
            };
          })
          .catch((error) => {
            console.error("[useFirebase] 無法設置權限監聽:", error);
          });
      }
    }
  }, []);

  // 初始化 Messaging (僅當有權限時)
  const setupMessagingWithPermission = useCallback(async () => {
    if (!app || notificationPermission !== "granted") return;

    try {
      console.log("[useFirebase] 初始化 Messaging");
      const result = await initializeMessaging(app);

      if (result.messaging) {
        setMessaging(result.messaging);
        console.log("[useFirebase] Messaging 初始化成功");
      }

      if (result.fcmToken) {
        setFcmToken(result.fcmToken);
        console.log("[useFirebase] FCM Token 已獲取");
      } else {
        console.log("[useFirebase] 無法獲取 FCM Token 或 FCM Token 未變更");
      }

      return result;
    } catch (error) {
      console.error("[useFirebase] Messaging 初始化錯誤:", error);
      return null;
    }
  }, [app, notificationPermission]);

  // 請求通知權限
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("[useFirebase] 此環境不支持通知");
      return false;
    }

    try {
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted ? "granted" : "denied");
      console.log("[useFirebase] 通知權限:", granted ? "已授予" : "已拒絕");

      // 如果獲得權限且應用已初始化
      if (granted && app) {
        // 先呼叫 getFcmToken 確保取得最新 token
        console.log("[useFirebase] 通知權限被授予，立即獲取 FCM Token");

        const { getFcmToken } = await import("@/utils/firebase");
        const token = await getFcmToken();

        if (token) {
          setFcmToken(token);
          console.log("[useFirebase] 權限變更後成功獲取 FCM Token");
        }

        // 再設置 Messaging
        setupMessagingWithPermission();
      }

      return granted;
    } catch (error) {
      console.error("[useFirebase] 請求通知權限錯誤:", error);
      return false;
    }
  }, [app, setupMessagingWithPermission]);

  // 監聽通知權限變更
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      // 只有當權限從非 granted 變為 granted 時才需要調用 getFcmToken
      if (notificationPermission === "granted" && app) {
        console.log(
          "[useFirebase] 通知權限變為 granted，確保獲取最新的 FCM Token",
        );
        // 從 firebase.ts 導入 getFcmToken 函數
        import("@/utils/firebase").then(({ getFcmToken }) => {
          getFcmToken().then((token) => {
            if (token) {
              setFcmToken(token);
              console.log("[useFirebase] 權限變更後重新獲取 FCM Token 成功");
            }
          });
        });
      }
    }
  }, [notificationPermission, app]);

  // 當應用初始化且有權限時，自動設置 Messaging
  useEffect(() => {
    if (app && notificationPermission === "granted") {
      setupMessagingWithPermission();
    }
  }, [app, notificationPermission, setupMessagingWithPermission]);

  // 發送測試通知
  const sendTestNotification = useCallback(async () => {
    if (notificationPermission !== "granted") {
      console.log("[useFirebase] 無通知權限，嘗試請求");
      const granted = await requestPermission();
      if (!granted) {
        console.log("[useFirebase] 通知權限被拒絕，無法發送測試通知");
        return false;
      }
    }

    try {
      console.log("[useFirebase] 發送測試通知");

      // 首先嘗試使用直接方法
      console.log("[useFirebase] 嘗試使用直接通知方法");
      await showDirectNotification("直接測試通知", {
        body: "這是直接顯示的測試通知，如果看到這個，說明基本通知功能正常。",
        icon: "/icons/PWALogo.png",
        tag: "direct-test-" + new Date().getTime(),
      });

      // 延遲後再嘗試 Firebase 方法，避免多個通知同時顯示互相覆蓋
      setTimeout(async () => {
        try {
          // 使用 Firebase 顯示通知
          const mockPayload = {
            notification: {
              title: "Firebase 測試通知",
              body: "這是通過 Firebase 發送的測試通知，如果看到這個，說明 Firebase 推送功能正常。",
            },
            data: {
              title: "Firebase 測試數據",
              body: "這是 Firebase 測試的數據內容",
              click_action: "/Home",
            },
          };
          await showNotification(mockPayload as any);
        } catch (fbError) {
          console.error("[useFirebase] Firebase 通知顯示錯誤:", fbError);
        }
      }, 1000);

      return true;
    } catch (error) {
      console.error("[useFirebase] 發送測試通知錯誤:", error);

      // 如果所有方法都失敗，嘗試使用 alert
      try {
        alert("測試通知\n通知功能似乎無法正常工作，請檢查瀏覽器設置。");
      } catch (alertError) {
        console.error("[useFirebase] 連 alert 都無法顯示:", alertError);
      }

      return false;
    }
  }, [notificationPermission, requestPermission]);

  return {
    app,
    analytics,
    messaging,
    fcmToken,
    notificationPermission,
    requestPermission,
    sendTestNotification,
    isClient,
  };
}
