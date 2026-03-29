"use client";

import { useEffect, useState } from "react";
import NotificationSettings from "@/components/NotificationSettings";
import {
  ensureMessagingServiceWorker,
  getFcmToken,
  initializeFirebase,
  initializeMessaging,
  requestNotificationPermission,
} from "@/utils/firebase";

type SendResult = { ok: boolean; message: string };

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>("");
  const [result, setResult] = useState<SendResult | null>(null);
  const [listening, setListening] = useState(false);
  const [swControlled, setSwControlled] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendTitle, setSendTitle] = useState("測試標題");
  const [sendBody, setSendBody] = useState("這是一則測試推播訊息");
  const [sendToken, setSendToken] = useState("");
  const [swResetting, setSwResetting] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      console.log(
        "[Home] initial SW controller:",
        navigator.serviceWorker.controller ? "present" : "absent"
      );
      setSwControlled(!!navigator.serviceWorker.controller);
      const onControllerChange = () => {
        console.log("[Home] SW controllerchange fired");
        setSwControlled(true);
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
      return () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
      };
    }
    return;
  }, []);

  useEffect(() => {
    const maxLogs = 200;
    const pushLog = (level: string, args: unknown[]) => {
      const text = args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
    };

    const original = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    console.log = (...args: unknown[]) => {
      pushLog("log", args);
      original.log(...args);
    };
    console.warn = (...args: unknown[]) => {
      pushLog("warn", args);
      original.warn(...args);
    };
    console.error = (...args: unknown[]) => {
      pushLog("error", args);
      original.error(...args);
    };
    console.info = (...args: unknown[]) => {
      pushLog("info", args);
      original.info(...args);
    };

    return () => {
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
      console.info = original.info;
    };
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
    };
    const onRejection = (event: PromiseRejectionEvent) => {
    };
    const onClick = () => {
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    // Ensure SW is registered even before controller is ready
    ensureMessagingServiceWorker().then((reg) => {
      if (reg) {
        console.log("[Home] ensureMessagingServiceWorker OK");
      }
    });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setLastMessage(detail);
    };
    window.addEventListener("fcm-message", handler);
    return () => window.removeEventListener("fcm-message", handler);
  }, []);

  const fetchToken = async () => {
    if (loading) return;
    if (!swControlled) {
      console.log("[Home] fetchToken blocked: SW not controlled");
      setResult({
        ok: false,
        message: "Service Worker 尚未控制頁面，請稍後或重新整理",
      });
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      console.log("[Home] requestNotificationPermission()");
      const granted = await requestNotificationPermission();
      if (!granted) {
        setResult({ ok: false, message: "通知權限未授予" });
        return;
      }

      console.log("[Home] getFcmToken()");
      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        setResult({ ok: false, message: "取得 FCM Token 失敗" });
        return;
      }

      setToken(fcmToken);
      setResult({ ok: true, message: "已取得 FCM Token" });
    } catch (error) {
      setResult({ ok: false, message: "取得失敗，請查看 console" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setResult({ ok: true, message: "已複製到剪貼簿" });
    } catch {
      setResult({ ok: false, message: "複製失敗，請手動複製" });
    }
  };

  const sendMessage = async () => {
    if (sendLoading) return;
    const targetToken = sendToken || token;
    if (!targetToken) {
      setResult({ ok: false, message: "請先取得或填入 Token" });
      return;
    }
    setSendLoading(true);
    setResult(null);
    try {
      console.log("[Home] sendMessage()", {
        token: targetToken ? "present" : "missing",
        title: sendTitle,
      });
      const res = await fetch("/api/v1/fcm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: targetToken,
          title: sendTitle,
          body: sendBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          ok: false,
          message: data?.message || "發送失敗",
        });
        return;
      }
      setResult({ ok: true, message: "已送出訊息" });
    } catch (error) {
      console.error(error);
      setResult({ ok: false, message: "發送失敗，請查看 console" });
    } finally {
      setSendLoading(false);
    }
  };

  const resetServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      setResult({ ok: false, message: "此瀏覽器不支援 Service Worker" });
      return;
    }
    if (swResetting) return;
    setSwResetting(true);
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      let removed = 0;
      for (const reg of regs) {
        if (reg.active?.scriptURL.includes("firebase-messaging-sw.js")) {
          await reg.unregister();
          removed += 1;
        }
      }
      setResult({
        ok: true,
        message:
          removed > 0
            ? "已移除 Service Worker，將重新整理"
            : "未找到 Service Worker，將重新整理",
      });
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      console.error(error);
      setResult({ ok: false, message: "重設失敗，請查看 console" });
    } finally {
      setSwResetting(false);
    }
  };

  const startListening = async () => {
    if (listening) return;
    if (!swControlled) {
      console.log("[Home] startListening blocked: SW not controlled");
      setResult({
        ok: false,
        message: "Service Worker 尚未控制頁面，請稍後或重新整理",
      });
      return;
    }
    setListening(true);
    setResult(null);
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        setResult({
          ok: false,
          message: "通知權限未授予，請點擊上方鈴鐺開啟",
        });
        setListening(false);
        return;
      }
      const app = initializeFirebase();
      if (!app) {
        setResult({ ok: false, message: "Firebase 初始化失敗" });
        setListening(false);
        return;
      }
      console.log("[Home] initializeMessaging()");
      await initializeMessaging(app);
      setResult({ ok: true, message: "已開始接收前景訊息" });
    } catch (error) {
      console.error(error);
      setResult({ ok: false, message: "啟用接收失敗，請查看 console" });
      setListening(false);
    }
  };

  useEffect(() => {
    if (swControlled) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swControlled]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="mb-6 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
        <NotificationSettings />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          FCM Token 取得
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          按下按鈕取得 token，貼到 Firebase Console 直接發送測試通知。
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={fetchToken}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "取得中..." : "取得 FCM Token"}
          </button>
          <button
            onClick={resetServiceWorker}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
            disabled={swResetting}
          >
            {swResetting ? "重設中..." : "重設 Service Worker"}
          </button>
          <div className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800">
            {listening
              ? "已開始接收訊息"
              : swControlled
              ? "初始化接收中..."
              : "等待 Service Worker 控制頁面..."}
          </div>
        </div>
        {token && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500">FCM Token</div>
            <div className="mt-2 break-all text-xs text-zinc-900">
              {token}
            </div>
            <button
              onClick={copyToken}
              className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
            >
              複製 Token
            </button>
          </div>
        )}
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">發送訊息</div>
          <input
            value={sendTitle}
            onChange={(e) => setSendTitle(e.target.value)}
            placeholder="標題"
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black"
          />
          <textarea
            value={sendBody}
            onChange={(e) => setSendBody(e.target.value)}
            placeholder="內容"
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black"
            rows={3}
          />
          <input
            value={sendToken}
            onChange={(e) => setSendToken(e.target.value)}
            placeholder="Token（可留空，預設使用上方 Token）"
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-xs text-black"
          />
          <button
            onClick={sendMessage}
            className="mt-3 w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={sendLoading}
          >
            {sendLoading ? "送出中..." : "送出訊息"}
          </button>
        </div>
        {lastMessage && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">最新收到的訊息</div>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-emerald-900">
{JSON.stringify(lastMessage, null, 2)}
            </pre>
          </div>
        )}
        {result && (
          <p
            className={`mt-3 text-sm ${
              result.ok ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
