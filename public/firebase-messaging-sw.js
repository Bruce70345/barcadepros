importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js"
);

console.log("[Firebase SW] Service Worker 版本 1.0.0 載入中...");

/**
 *  Payload interface
 * {
 *   "collapseKey": string;
 *   "data": { [key: string]: string };
 *   "fcmOptions": {
 *     "analyticsLabel": string,
 *     "link": string
 *   };
 *   "from": string;
 *   "messageId": string;
 *   "notification": {
 *     "title": string,
 *       "body": string,}
 *  }
 */

const firebaseConfig = {
  apiKey: "AIzaSyBgfHS4p21liDojkleWOCHceNwUTJa0s7E",
  authDomain: "barcadepro-423cc.firebaseapp.com",
  projectId: "barcadepro-423cc",
  storageBucket: "barcadepro-423cc.firebasestorage.app",
  messagingSenderId: "764514102764",
  appId: "1:764514102764:web:676698180edb24b2a0e4c9",
  measurementId: "G-1GJCHPKRTK"
};

// 初始化 Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("[Firebase SW] Firebase 初始化成功");
  const messaging = firebase.messaging();

  // 添加更多日誌來幫助調試
  console.log("[Firebase SW] Messaging 初始化成功");
  console.log("[Firebase SW] 版本: 1.0.1");
  console.log("[Firebase SW] 路徑:", self.registration.scope);

  // 監聽背景消息
  messaging.onBackgroundMessage(async (payload) => {
    try {
      console.log("[Firebase SW] 收到背景消息:", payload);
      console.log("[Firebase SW] 背景消息類型:", typeof payload);
      console.log("[Firebase SW] 背景消息數據:", JSON.stringify(payload));

      // 確保數據存在
      if (!payload) {
        console.error("[Firebase SW] 無效的通知數據");
        return;
      }

      // 從 payload 中提取通知數據
      let notificationTitle,
        notificationBody,
        notificationData,
        notificationTag,
        clickAction;

      if (payload.data) {
        console.log("[Firebase SW] 使用 data 欄位");
        notificationTitle = payload.data.title || "新通知";
        notificationBody = payload.data.body || "您有新消息";
        notificationData = payload.data;
        notificationTag = payload.data.tag || "default-tag";
        clickAction = payload.data.click_action || "/";
      } else if (payload.notification) {
        console.log("[Firebase SW] 使用 notification 欄位");
        notificationTitle = payload.notification.title || "新通知";
        notificationBody = payload.notification.body || "您有新消息";
        notificationData = payload.notification;
        notificationTag = payload.notification.tag || "default-tag";
        clickAction = payload.notification.click_action || "/";
      } else {
        console.error("[Firebase SW] 無效的通知數據格式");
        return;
      }

      // 強制直接使用固定值 (用於調試)
      notificationTitle = "測試通知";
      notificationBody = "這是一個測試通知";

      // 建立通知選項
      const notificationOptions = {
        body: notificationBody,
        icon: "/icons/PWALogo.png",
        image: "/icons/PWALogo.png",
        data: { ...notificationData, click_action: clickAction },
        tag: notificationTag,
        requireInteraction: true,
        vibrate: [100, 50, 100],
        actions: [
          {
            action: "view",
            title: "查看",
          },
          {
            action: "close",
            title: "關閉",
          },
        ],
      };

      console.log("[Firebase SW] 顯示通知:", {
        title: notificationTitle,
        options: notificationOptions,
      });

      // 顯示通知
      // await self.registration.showNotification(
      //   notificationTitle,
      //   notificationOptions
      // );
      console.log("[Firebase SW] 通知已顯示");
    } catch (error) {
      console.error("[Firebase SW] 處理背景消息錯誤:", error);
    }
  });

  console.log("[Firebase SW] 背景消息處理器設置完成");
} catch (error) {
  console.error("[Firebase SW] Firebase 初始化失敗:", error);
}

// 處理通知點擊
self.addEventListener("notificationclick", (event) => {
  try {
    console.log("[Firebase SW] 通知被點擊:", event);

    // 關閉通知
    event.notification.close();

    // 獲取動作
    const action = event.action;
    if (action === "close") {
      console.log("[Firebase SW] 用戶選擇關閉通知");
      return;
    }

    // 獲取數據並確定要打開的 URL
    const notificationData = event.notification.data || {};
    const url = notificationData.click_action || "/";

    console.log("[Firebase SW] 將打開 URL:", url);

    // 打開或聚焦窗口
    event.waitUntil(openWindowOrTab(url));
  } catch (error) {
    console.error("[Firebase SW] 處理通知點擊錯誤:", error);
  }
});

// 打開或聚焦窗口的函數
function openWindowOrTab(url) {
  return clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      if (clientList.length === 0) {
        console.log("[Firebase SW] 沒有打開的窗口，創建新窗口");
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      } else {
        console.log("[Firebase SW] 找到現有窗口:", clientList.length);
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            console.log("[Firebase SW] 聚焦現有窗口");
            return client.focus();
          }
        }
        console.log("[Firebase SW] 沒有匹配的窗口，創建新窗口");
        return clients.openWindow(url);
      }
    })
    .catch((error) => {
      console.error("[Firebase SW] 打開或聚焦窗口時出錯:", error);
    });
}

// 安裝事件
self.addEventListener("install", (event) => {
  console.log("[Firebase SW] 安裝中...");
  // 立即激活，不等待舊的 Service Worker 終止
  event.waitUntil(self.skipWaiting());
});

// 激活事件
self.addEventListener("activate", (event) => {
  console.log("[Firebase SW] 激活中...");
  // 立即接管所有客戶端
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log("[Firebase SW] 已接管所有客戶端");
    })
  );
});

// 添加消息接收事件處理
self.addEventListener("message", (event) => {
  console.log("[Firebase SW] 收到客戶端消息:", event.data);

  // 嘗試回覆發送消息的客戶端
  if (event.source) {
    event.source.postMessage({
      type: "SW_RESPONSE",
      payload: {
        received: true,
        originalMessage: event.data,
        timestamp: new Date().toISOString(),
        swScope: self.registration.scope,
      },
    });
    console.log("[Firebase SW] 已回覆客戶端");
  } else {
    console.log("[Firebase SW] 無法回覆客戶端，沒有 source");
  }
});

console.log("[Firebase SW] Service Worker 設置完成");

let requestCounter = 0;

// self.addEventListener("fetch", function (e) {
//   if ("setAppBadge" in navigator) {
//     navigator.setAppBadge(++requestCounter);
//   }
//   console.log("[Service Worker] Fetch", e.request.url);
//   e.respondWith(fetch(e.request));
// });

// self.addEventListener("fetch", function (e) {
//   if ("setAppBadge" in navigator) {
//     navigator.setAppBadge(++requestCounter);
//   }
//   console.log("[Service Worker] Fetch", e.request.url);
//   e.respondWith(fetch(e.request));
// });

// self.addEventListener("focus", function () {
//   if ("clearAppBadge" in navigator) {
//     navigator.clearAppBadge();
//   }
// });

// --------------------------------------------------------------------
// if ("geolocation" in navigator) {
//   navigator.geolocation.getCurrentPosition(function (position) {
//     do_something(position.coords.latitude, position.coords.longitude);
//   });
// } else {
//   /* geolocation IS NOT available */
// }

// const watchID = navigator.geolocation.watchPosition(function (position) {
//   do_something(position.coords.latitude, position.coords.longitude);
// });

// async function openWindowOrTab(url) {
//   try {
//     const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
//     if (clients.length === 0) {
//       // No open clients, open a new one
//       await self.clients.openWindow(url);
//     } else {
//       // An open client, focus on it
//       await clients[0].focus();
//     }
//   } catch (error) {
//     console.error('Error opening window or tab:', error);
//     // Fallback to showing a notification
//     await self.registration.showNotification('Notification', {
//       body: 'Click to open the app',
//       data: { click_action: url },
//       icon: '/icons/pamexLogo.png',
//       tag: 'notification-click'
//     });
//   }
// }
