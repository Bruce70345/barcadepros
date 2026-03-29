import { createEvent, listEventsInRange } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";
import { sendRealtimeForEvent } from "@/server/notificationService";
import { requireIsoDate, requireLength } from "@/server/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body:
    | {
        user_id?: string;
        title?: string;
        category?: string;
        description?: string;
        start_at?: string;
        send_realtime?: boolean;
        recurrence_rule?: string;
        turnstile_token?: string;
      }
    | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const turnstileError = await requireTurnstile(body?.turnstile_token);
  if (turnstileError) return turnstileError;

  const rateLimitError = requireRateLimit(request);
  if (rateLimitError) return rateLimitError;

  if (!body?.user_id) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }
  if (!body?.title) {
    return Response.json({ message: "title is required" }, { status: 400 });
  }
  const titleError = requireLength(body.title, 100, "title");
  if (titleError) return titleError;
  if (!body?.start_at) {
    return Response.json({ message: "start_at is required" }, { status: 400 });
  }
  const startAtError = requireIsoDate(body.start_at, "start_at");
  if (startAtError) return startAtError;
  if (body?.description) {
    const descError = requireLength(body.description, 1000, "description");
    if (descError) return descError;
  }

  const record = await createEvent({
    user_id: body.user_id,
    title: body.title,
    category: body.category,
    description: body.description,
    start_at: body.start_at,
    send_realtime: Boolean(body.send_realtime),
    recurrence_rule: body.recurrence_rule,
  });

  let realtimeResult: unknown = null;
  if (record.send_realtime) {
    realtimeResult = await sendRealtimeForEvent(record.id);
  }

  return Response.json(
    { id: record.id, realtime: realtimeResult },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const events = await listEventsInRange({ from, to });
  return Response.json(events, { status: 200 });
}
