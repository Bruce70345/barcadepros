import {
  createNotification,
  getEventById,
  listActiveTokensByUserIds,
  listActiveUsersByPreference,
} from "@/server/appStore";
import { getAdminMessaging } from "@/server/firebaseAdmin";

function isQuietHoursTaipei(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  return hour >= 22 || hour < 8;
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function sendRealtimeForEvent(eventId: string) {
  const event = await getEventById(eventId);
  if (!event) {
    return { ok: false, message: "event not found" } as const;
  }

  const now = new Date();
  if (isQuietHoursTaipei(now)) {
    await createNotification({
      type: "realtime",
      title: "新活動",
      body: event.title,
      send_at: now.toISOString(),
      status: "sent",
    });
    return { ok: true, sent: 0, skipped: true, reason: "quiet_hours" } as const;
  }

  const users = await listActiveUsersByPreference({ realtime: true });
  const tokens = await listActiveTokensByUserIds(users.map((u) => u.id));

  if (tokens.length === 0) {
    await createNotification({
      type: "realtime",
      title: "新活動",
      body: event.title,
      send_at: now.toISOString(),
      status: "sent",
    });
    return { ok: true, sent: 0 } as const;
  }

  try {
    const messaging = getAdminMessaging();
    let successCount = 0;
    let failureCount = 0;

    for (const batch of chunk(tokens, 500)) {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: "新活動",
          body: event.title,
        },
        data: {
          event_id: event.id,
          type: "realtime",
        },
      });
      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    await createNotification({
      type: "realtime",
      title: "新活動",
      body: event.title,
      send_at: now.toISOString(),
      status: failureCount > 0 ? "failed" : "sent",
    });

    return {
      ok: failureCount === 0,
      sent: tokens.length,
      successCount,
      failureCount,
    } as const;
  } catch (error: any) {
    await createNotification({
      type: "realtime",
      title: "新活動",
      body: event.title,
      send_at: now.toISOString(),
      status: "failed",
    });

    return {
      ok: false,
      message: "FCM send failed",
      detail: error?.message || error,
    } as const;
  }
}
