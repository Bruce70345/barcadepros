import {
  createNotification,
  getEventById,
  getUserById,
  listActiveTokensByUserIds,
  listActiveUsersByPreference,
} from "@/server/appStore";
import { getAdminMessaging } from "@/server/firebaseAdmin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  const sender = event.user_id ? await getUserById(event.user_id) : null;
  const senderName = sender?.name?.trim() || "Someone";
  const invitationBody = `${senderName} sent an invitation`;

  const now = new Date();
  // NOTE: Quiet hours disabled temporarily for testing.
  // if (isQuietHoursTaipei(now)) {
  //   await createNotification({
  //     type: "realtime",
  //     title: invitationBody,
  //     body: event.title,
  //     send_at: now.toISOString(),
  //     status: "skipped",
  //   });
  //   return { ok: true, sent: 0, skipped: true, reason: "quiet_hours" } as const;
  // }

  const users = await listActiveUsersByPreference({ realtime: true });
  const tokens = await listActiveTokensByUserIds(users.map((u) => u.id));

  if (tokens.length === 0) {
    await createNotification({
      type: "realtime",
      title: invitationBody,
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
          title: invitationBody,
          body: event.title,
        },
        data: {
          event_id: event.id,
          type: "realtime",
          click_action: `${siteUrl}/?event=${event.id}`,
        },
      });
      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    await createNotification({
      type: "realtime",
      title: invitationBody,
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
      title: invitationBody,
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

export async function sendRealtimeForBingoLine(totalLines: number, userName?: string) {
  const count = Number(totalLines);
  if (!Number.isFinite(count) || count <= 0) {
    return { ok: false, message: "invalid totalLines" } as const;
  }

  const senderName = userName?.trim() || "Someone";
  const title = "Bingo!";
  const body = count === 1 ? `${senderName} now has 1 line.` : `${senderName} now has ${count} lines.`;

  const users = await listActiveUsersByPreference({ realtime: true });
  const tokens = await listActiveTokensByUserIds(users.map((u) => u.id));

  if (tokens.length === 0) {
    return { ok: true, sent: 0 } as const;
  }

  try {
    const messaging = getAdminMessaging();
    let successCount = 0;
    let failureCount = 0;

    for (const batch of chunk(tokens, 500)) {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: {
          type: "bingo",
          click_action: `${siteUrl}/bingo`,
        },
      });
      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    return {
      ok: true,
      sent: tokens.length,
      successCount,
      failureCount,
      warning: failureCount > 0 ? "some_tokens_failed" : undefined,
    } as const;
  } catch (error: any) {
    return {
      ok: false,
      message: "FCM send failed",
      detail: error?.message || error,
    } as const;
  }
}
