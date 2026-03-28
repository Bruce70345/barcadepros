"use client";
import config from "@/api/BarcadeproApi";
import Rabbit from "crypto-js/rabbit";
import { getAnalytics, logEvent } from "firebase/analytics";
import { FirebaseApp, initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  MessagePayload,
  onMessage,
} from "firebase/messaging";
import { getFromIndexedDB, setToIndexedDB } from "./IndexDBsetting";
import { parseUserAgent } from "./utils";

const SW_SCRIPT_URL = "/firebase-messaging-sw.js";

// Firebase 配置
export const firebaseConfig = {
  apiKey: "AIzaSyBgfHS4p21liDojkleWOCHceNwUTJa0s7E",
  authDomain: "barcadepro-423cc.firebaseapp.com",
  projectId: "barcadepro-423cc",
  storageBucket: "barcadepro-423cc.firebasestorage.app",
  messagingSenderId: "764514102764",
  appId: "1:764514102764:web:676698180edb24b2a0e4c9",
  measurementId: "G-1GJCHPKRTK"
};

export const vapidKey =
  "BOCUzy-rne7Ci3vnAjUGldWRDpr6Zg-vdxDspJx3cfKjaBvwNaEIhVMmU8qpMLfgsegsT4mz4DYJP25mEbmfY1I";

// 初始化 Firebase (單例模式)
let firebaseApp: FirebaseApp | null = null;
export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    firebaseApp = initializeApp(firebaseConfig);
    console.log("[Firebase Client] Firebase 初始化成功");
    return firebaseApp;
  } catch (error) {
    console.error("[Firebase Client] Firebase 初始化失敗:", error);
    return null;
  }
}

// 初始化 Firebase 分析
export function initializeAnalytics(app: FirebaseApp) {
  try {
    const analytics = getAnalytics(app);

    // 追蹤頁面訪問
    const currentPage = window.location.pathname;
    const userName = localStorage.getItem("userName");

    logEvent(analytics, "page_view", {
      page_name: currentPage,
      user_id: userName || "anonymous",
    });

    return analytics;
  } catch (error) {
    console.error("Error initializing Firebase Analytics:", error);
    return null;
  }
}

// 檢查通知權限
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    console.log("[Firebase Client] 通知權限狀態:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("[Firebase Client] 請求通知權限失敗:", error);
    return false;
  }
}

export async function ensureMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[Firebase Client] Service Worker not supported");
    return null;
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    console.log("[Firebase Client] No SW registration, registering...");
    try {
      registration = await navigator.serviceWorker.register(SW_SCRIPT_URL, {
        scope: "/",
        updateViaCache: "none",
      });
      console.log(
        "[Firebase Client] SW registered from ensureMessagingServiceWorker:",
        registration.scope
      );
    } catch (error) {
      console.error(
        "[Firebase Client] Failed to register SW in ensureMessagingServiceWorker:",
        error
      );
      return null;
    }
  } else {
    console.log(
      "[Firebase Client] Existing SW registration found:",
      registration.scope
    );
  }

  try {
    await registration.update();
    console.log("[Firebase Client] SW update check complete");
  } catch (error) {
    console.warn("[Firebase Client] SW update check failed:", error);
  }

  return registration;
}

// 初始化 Firebase Messaging
export async function initializeMessaging(app: FirebaseApp) {
  try {
    console.log("[Firebase Client] Starting to initialize Firebase Messaging");

    // 1. Check browser support
    if (!("serviceWorker" in navigator)) {
      console.error(
        "[Firebase Client] Browser does not support Service Worker"
      );
      return { messaging: null, fcmToken: null, registration: null };
    }

    // 2. Check notification permission (but don't request it actively)
    const permission = Notification.permission;
    console.log(
      "[Firebase Client] Current notification permission status:",
      permission
    );
    if (permission !== "granted") {
      console.log(
        "[Firebase Client] Notification permission not granted, manual authorization needed"
      );
      return { messaging: null, fcmToken: null, registration: null };
    }

    // 3. Initialize messaging
    const messaging = getMessaging(app);
    console.log("[Firebase Client] Messaging initialized successfully");

    // 4. Check if FCM token already exists
    const existingToken = await getFromIndexedDB("fcmToken");
    if (existingToken) {
      console.log("[Firebase Client] Found existing FCM Token in IndexedDB");
    }

    // 5. Check existing Service Worker registration
    console.log(
      "[Firebase Client] Checking Service Worker registration status"
    );
    let registration;

    try {
      // First check if firebase-messaging-sw.js is already registered
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(
        "[Firebase Client] Number of Service Worker registrations:",
        registrations.length
      );

      if (registrations.length > 0) {
        console.log("[Firebase Client] Existing Service Worker URLs:");
        for (const reg of registrations) {
          if (reg.active) {
            console.log(`- ${reg.active.scriptURL}`);
          } else if (reg.installing) {
            console.log(`- ${reg.installing.scriptURL} (installing)`);
          } else if (reg.waiting) {
            console.log(`- ${reg.waiting.scriptURL} (waiting)`);
          }
        }
      }

      // Look for existing firebase-messaging-sw.js Service Worker
      registrations.forEach((reg) => {
        console.log(reg.active?.scriptURL);
      });
      const fbMessagingWorker = registrations.find(
        (reg) =>
          reg.active &&
          reg.active.scriptURL.includes("firebase-messaging-sw.js")
      );

      if (fbMessagingWorker) {
        console.log(
          "[Firebase Client] Found existing Firebase Messaging Service Worker, using it"
        );
        registration = fbMessagingWorker;
      } else {
        console.log(
          "[Firebase Client] Firebase Messaging Service Worker not found, creating new one"
        );

        // Only unregister other non-Firebase Service Workers
        for (const reg of registrations) {
          if (
            reg.active &&
            reg.active.scriptURL.includes("sw.js") &&
            !reg.active.scriptURL.includes("firebase")
          ) {
            console.log(
              "[Firebase Client] Found non-Firebase Service Worker, attempting to unregister:",
              reg.active.scriptURL
            );
            try {
              await reg.unregister();
              console.log("[Firebase Client] Unregistration successful");
            } catch (unregError) {
              console.error(
                "[Firebase Client] Unregistration failed:",
                unregError
              );
            }
          }
        }

        // Register new Service Worker
        console.log(
          "[Firebase Client] Registering Firebase Messaging Service Worker"
        );
        try {
          registration = await navigator.serviceWorker.register(
            SW_SCRIPT_URL,
            {
              scope: "/",
              updateViaCache: "none", // Avoid caching issues
            }
          );

          // Wait for Service Worker activation
          if (registration.installing) {
            console.log("[Firebase Client] Service Worker installing...");
            const sw = registration.installing || registration.waiting;

            // Wait for Service Worker to be ready
            await new Promise<void>((resolve, reject) => {
              if (sw) {
                const timeoutId = setTimeout(() => {
                  reject(new Error("Service Worker installation timeout"));
                }, 10000); // 10 second timeout

                sw.addEventListener("statechange", (e) => {
                  console.log(
                    "[Firebase Client] Service Worker state change:",
                    sw.state
                  );
                  if (sw.state === "activated") {
                    console.log("[Firebase Client] Service Worker activated");
                    clearTimeout(timeoutId);
                    resolve();
                  } else if (sw.state === "redundant") {
                    clearTimeout(timeoutId);
                    reject(new Error("Service Worker became redundant"));
                  }
                });
              } else {
                // Already activated
                resolve();
              }
            });
          }
        } catch (registerError) {
          console.error(
            "[Firebase Client] Failed to register Service Worker:",
            registerError
          );
          // Try to use any existing Service Worker
          const anyRegistration =
            await navigator.serviceWorker.getRegistration();
          if (anyRegistration) {
            console.log(
              "[Firebase Client] Using any existing Service Worker as fallback"
            );
            registration = anyRegistration;
          } else {
            throw new Error(
              "Cannot register Service Worker and no existing SW found"
            );
          }
        }
      }

      if (registration && registration.active) {
        console.log(
          "[Firebase Client] Service Worker is active:",
          registration.active.state
        );
        console.log(
          "[Firebase Client] Service Worker URL:",
          registration.active.scriptURL
        );
      } else if (registration) {
        console.log(
          "[Firebase Client] Service Worker registration status:",
          registration.installing
            ? "installing"
            : registration.waiting
            ? "waiting"
            : "unknown"
        );
      }

      console.log(
        "[Firebase Client] Service Worker registration successful:",
        registration.scope
      );
    } catch (regError) {
      console.error(
        "[Firebase Client] Error during Service Worker registration process:",
        regError
      );
      return { messaging: null, fcmToken: null, registration: null };
    }

    // 6. Get FCM Token
    console.log("[Firebase Client] Attempting to get FCM Token");
    let fcmToken;

    // Try to use existing token
    if (existingToken) {
      console.log("[Firebase Client] Using existing FCM Token");
      fcmToken = existingToken;
    } else {
      // Generate new token
      try {
        console.log("[Firebase Client] Generating new FCM Token");
        fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          console.log(
            "[Firebase Client] New FCM Token generated successfully, storing to IndexedDB"
          );
          const eToken = Rabbit.encrypt(fcmToken, "ALZK").toString();
          await setToIndexedDB("fcmToken", eToken);
        } else {
          console.error(
            "[Firebase Client] FCM Token generation failed, return value is empty"
          );
        }
      } catch (tokenError) {
        console.error(
          "[Firebase Client] Error generating FCM Token:",
          tokenError
        );
        return { messaging, fcmToken: null, registration };
      }
    }

    // 呼叫 getFcmToken 處理內部資料庫邏輯
    if (fcmToken) {
      console.log("[Firebase Client] 調用 getFcmToken 處理內部資料庫邏輯");
      try {
        await getFcmToken();
      } catch (dbError) {
        console.error("[Firebase Client] 處理內部資料庫邏輯失敗:", dbError);
      }
    }

    // 7. Setup foreground message handler
    try {
      setupForegroundMessageHandler(messaging);
      console.log(
        "[Firebase Client] Foreground message handler setup successful"
      );
    } catch (handlerError) {
      console.error(
        "[Firebase Client] Failed to set up foreground message handler:",
        handlerError
      );
    }

    return { messaging, fcmToken, registration };
  } catch (error) {
    console.error(
      "[Firebase Client] Overall initialization process failed:",
      error
    );
    return { messaging: null, fcmToken: null, registration: null };
  }
}

// Display notification (Firebase message)
export async function showNotification(payload: MessagePayload) {
  try {
    console.log("[Firebase Client] Attempting to show notification:", payload);

    if (!payload || (!payload.notification && !payload.data)) {
      console.error("[Firebase Client] Invalid notification data");
      return;
    }

    // Check notification permission
    if (Notification.permission !== "granted") {
      console.error("[Firebase Client] Notification permission not granted");
      return;
    }

    // Get Service Worker registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error(
        "[Firebase Client] Unable to get Service Worker registration"
      );

      // Try using native Notification API as fallback
      try {
        const title =
          payload.notification?.title ||
          payload.data?.title ||
          "New Notification";
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          "You have a new message";

        new Notification(title, {
          body,
          icon: "/icons/PWALogo.png",
        });

        console.log("[Firebase Client] Notification displayed via native API");
        return;
      } catch (nativeError) {
        console.error(
          "[Firebase Client] Native notification API also failed:",
          nativeError
        );
        return;
      }
    }

    // Use Service Worker to display notification
    const title =
      payload.notification?.title || payload.data?.title || "New Notification";
    const options = {
      body:
        payload.notification?.body ||
        payload.data?.body ||
        "You have a new message",
      icon: "/icons/PWALogo.png",
      data: payload.data || payload.notification || {},
      tag: payload.data?.tag || "default-tag",
      requireInteraction: true,
    };

    await registration.showNotification(title, options);
    console.log("[Firebase Client] Notification displayed successfully");
  } catch (error) {
    console.error("[Firebase Client] Error displaying notification:", error);

    // Try using direct Notification API as a last attempt
    try {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "New Notification";
      const body =
        payload.notification?.body ||
        payload.data?.body ||
        "You have a new message";

      new Notification(title, {
        body,
        icon: "/icons/PWALogo.png",
      });

      console.log(
        "[Firebase Client] Notification displayed via native API in error handler"
      );
    } catch (finalError) {
      console.error(
        "[Firebase Client] All notification methods failed:",
        finalError
      );
    }
  }
}

// Show notification directly (not depending on Firebase)
export async function showDirectNotification(
  title: string,
  options: NotificationOptions = {}
) {
  try {
    console.log(
      "[Firebase Client] Attempting to show direct notification:",
      title
    );

    if (Notification.permission !== "granted") {
      console.error(
        "[Firebase Client] Notification permission not granted, cannot show notification"
      );
      return;
    }

    // Ensure there's an icon
    const mergedOptions = {
      ...options,
      icon: options.icon || "/icons/PWALogo.png",
      requireInteraction: true, // Ensure notification doesn't disappear automatically
      tag: options.tag || "direct-notification-" + Date.now(), // Ensure each notification is unique
    };

    // Try to display via Service Worker
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, mergedOptions);
        console.log(
          "[Firebase Client] Direct notification displayed successfully via Service Worker"
        );
        return;
      }
    } catch (swError) {
      console.error(
        "[Firebase Client] Service Worker notification failed:",
        swError
      );
    }

    // Try using native Notification API
    try {
      const notification = new Notification(title, mergedOptions);

      // Listen for notification events
      notification.onclick = () => {
        console.log("[Firebase Client] Notification clicked");
        window.focus();
      };

      notification.onshow = () => {
        console.log("[Firebase Client] Notification shown");
      };

      notification.onerror = (err) => {
        console.error("[Firebase Client] Error displaying notification:", err);
      };

      console.log(
        "[Firebase Client] Direct notification displayed successfully via native API"
      );
      return;
    } catch (nativeError) {
      console.error(
        "[Firebase Client] Native notification API failed:",
        nativeError
      );
    }

    // If all methods fail, try one last approach
    console.error(
      "[Firebase Client] All notification methods failed, trying alternative"
    );
    try {
      // Use alert as a last resort
      setTimeout(() => {
        alert(title + "\n" + (options.body || ""));
      }, 100);
    } catch (finalError) {
      console.error(
        "[Firebase Client] All notification methods completely failed:",
        finalError
      );
    }
  } catch (error) {
    console.error(
      "[Firebase Client] Error displaying direct notification:",
      error
    );
  }
}

// Set up foreground message handler
export function setupForegroundMessageHandler(messaging: any) {
  try {
    onMessage(messaging, (payload: MessagePayload) => {
      console.log("[Firebase Client] Received foreground message:", payload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fcm-message", { detail: payload })
        );
      }

      // Ensure notification registration
      navigator.serviceWorker.getRegistration().then(async (registration) => {
        if (!registration) {
          console.error(
            "[Firebase Client] Unable to get Service Worker registration"
          );
          return;
        }

        try {
          // Display notification directly
          const title =
            payload.notification?.title ||
            payload.data?.title ||
            "New Notification";
          const body =
            payload.notification?.body ||
            payload.data?.body ||
            "You have a new message";

          await registration.showNotification(title, {
            body,
            icon: "/icons/PWALogo.png",
            data: payload.data || {},
            tag: "foreground-notification",
            requireInteraction: true,
          });

          console.log(
            "[Firebase Client] Foreground notification displayed successfully"
          );
        } catch (error) {
          console.error(
            "[Firebase Client] Failed to display foreground notification:",
            error
          );
        }
      });
    });
    console.log("[Firebase Client] Foreground message handler setup complete");
  } catch (error) {
    console.error(
      "[Firebase Client] Failed to set up foreground message handler:",
      error
    );
  }
}

// Get FCM Token
let isUpdating = false;
export async function getFcmToken() {
  try {
    // Ensure Firebase app is initialized
    if (!firebaseApp) {
      const app = initializeFirebase();
      if (!app) {
        console.error("[Firebase Client] Firebase app not initialized");
        return null;
      }
    }

    // Avoid duplicate execution
    if (isUpdating) return null;
    isUpdating = true;

    // Get FCM Token
    const messaging = getMessaging();
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn(
        "[Firebase Client] No service worker registration found, registering..."
      );
      try {
        registration = await navigator.serviceWorker.register(
          SW_SCRIPT_URL,
          {
            scope: "/",
            updateViaCache: "none",
          }
        );
      } catch (err) {
        console.error(
          "[Firebase Client] Failed to register service worker:",
          err
        );
        isUpdating = false;
        return null;
      }
    }

    // Ensure SW is active before requesting token
    try {
      await navigator.serviceWorker.ready;
    } catch (readyError) {
      console.warn("[Firebase Client] Service Worker not ready:", readyError);
    }

    // Refresh registration in case it just became active
    registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.warn("[Firebase Client] Service Worker still not ready");
      isUpdating = false;
      return null;
    }

    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (fcmToken) {
      // Get old token and decrypt for comparison
      const oldToken = await getFromIndexedDB("fcmToken");
      const userAgent = parseUserAgent(navigator.userAgent);
      // Compare old and new tokens
      if (oldToken && oldToken === fcmToken) {
        console.log("[Firebase Client] FCM Token not changed");
        console.log(oldToken);
      } else {
        console.log(
          "[Firebase Client] FCM Token changed or new token received"
        );
        // Encrypt and store new token
        const eToken = Rabbit.encrypt(fcmToken, "ALZK").toString();
        await setToIndexedDB("fcmToken", eToken);

        // Get API token and update FCM token
        const token = await getFromIndexedDB("token");
        if (token) {
          const fcmTokenID = await getFromIndexedDB("fcmTokenId");

          if (fcmTokenID) {
            try {
              await config.UpdateFCMToken(
                fcmTokenID,
                fcmToken,
                userAgent.platform,
                userAgent.deviceInfo,
                token
              );
              console.log("[Firebase Client] FCM Token updated successfully");
            } catch (error) {
              await sendNewFcmToken(fcmToken, token);
            }
          } else {
            // No existing token ID, send new token
            await sendNewFcmToken(fcmToken, token);
          }
        } else {
          console.log(
            "[Firebase Client] No API token available, FCM token saved locally only"
          );
        }
      }
    } else {
      console.warn("[Firebase Client] No registration token available");
    }

    return fcmToken || null;
  } catch (error) {
    console.error("[Firebase Client] Error in getFcmToken:", error);
    return null;
  } finally {
    isUpdating = false;
  }
}

// Helper function: Send new FCM token to server
async function sendNewFcmToken(fcmToken: string, apiToken: string) {
  try {
    const userAgent = parseUserAgent(navigator.userAgent);
    const res: any = await config.SendFCMToken(
      fcmToken,
      userAgent.platform,
      userAgent.deviceInfo,
      apiToken
    );
    if (res && res.id) {
      const fcmTokenId = res.id.toString();
      const eID = Rabbit.encrypt(fcmTokenId, "ALZK").toString();
      await setToIndexedDB("fcmTokenId", eID);
      console.log("[Firebase Client] New FCM token sent and ID saved");
    }
  } catch (error) {
    console.error("[Firebase Client] Failed to send new FCM token:", error);
  }
}
