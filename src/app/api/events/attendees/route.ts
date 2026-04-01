import {
  getEventById,
  listEventAttendees,
  upsertEventAttendees,
} from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id") || "";
  if (!eventId) {
    return Response.json({ message: "event_id is required" }, { status: 400 });
  }
  const attendees = await listEventAttendees(eventId);
  return Response.json(
    { attendees, count: attendees.length },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const rateLimitError = requireRateLimit(request);
  if (rateLimitError) return rateLimitError;

  let body:
    | { event_id?: string; user_id?: string; join?: boolean }
    | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body?.event_id) {
    return Response.json({ message: "event_id is required" }, { status: 400 });
  }
  if (!body?.user_id) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }

  const event = await getEventById(body.event_id);
  const shouldJoin =
    event && event.user_id === body.user_id ? true : Boolean(body.join);

  await upsertEventAttendees([
    { event_id: body.event_id, user_id: body.user_id, is_active: shouldJoin },
  ]);

  return Response.json({ ok: true }, { status: 200 });
}
