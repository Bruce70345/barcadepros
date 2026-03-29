import {
  createNotification,
  listActiveTokensByUserIds,
  listActiveUsersByPreference,
  listEventsInRange,
} from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";
import { getAdminMessaging } from "@/server/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function POST(request: Request) {
  let body: { now?: string; turnstile_token?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const turnstileError = await requireTurnstile(body?.turnstile_token);
  if (turnstileError) return turnstileError;

  const rateLimitError = requireRateLimit(request, 2);
  if (rateLimitError) return rateLimitError;

  const now = body?.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return Response.json({ message: "invalid now" }, { status: 400 });
  }

  const to = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const events = await listEventsInRange({
    from: now.toISOString(),
    to: to.toISOString(),
  });
  const count = events.length;

  if (count === 0) {
    return Response.json({ ok: true, count: 0, sent: 0 }, { status: 200 });
  }

  const users = await listActiveUsersByPreference({ digest: true });
  const tokens = await listActiveTokensByUserIds(users.map((u) => u.id));

  if (tokens.length === 0) {
    await createNotification({
      type: "digest",
      title: "Event digest",
      body: `There are ${count} events in the next 72 hours.`,
      send_at: now.toISOString(),
      status: "sent",
    });
    return Response.json({ ok: true, count, sent: 0 }, { status: 200 });
  }

  try {
    const messaging = getAdminMessaging();
    let successCount = 0;
    let failureCount = 0;

    for (const batch of chunk(tokens, 500)) {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title: "Event digest",
          body: `There are ${count} events in the next 72 hours.`,
        },
        data: {
          type: "digest",
          count: String(count),
        },
      });
      successCount += result.successCount;
      failureCount += result.failureCount;
    }

    await createNotification({
      type: "digest",
      title: "Event digest",
      body: `There are ${count} events in the next 72 hours.`,
      send_at: now.toISOString(),
      status: failureCount > 0 ? "failed" : "sent",
    });

    return Response.json(
      {
        ok: failureCount === 0,
        count,
        sent: tokens.length,
        successCount,
        failureCount,
      },
      { status: failureCount === 0 ? 200 : 500 }
    );
  } catch (error: any) {
    await createNotification({
      type: "digest",
      title: "Event digest",
      body: `There are ${count} events in the next 72 hours.`,
      send_at: now.toISOString(),
      status: "failed",
    });

    return Response.json(
      { message: "FCM send failed", detail: error?.message || error },
      { status: 500 }
    );
  }
}
