import { deleteEvent, getEventById, getUserById, updateEvent } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";
import { requireIsoDate, requireLength } from "@/server/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkOwnerOrAdmin(eventId: string, userId?: string) {
  if (!userId) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }
  const event = await getEventById(eventId);
  if (!event) {
    return Response.json({ message: "event not found" }, { status: 404 });
  }
  const user = await getUserById(userId);
  if (!user) {
    return Response.json({ message: "user not found" }, { status: 404 });
  }
  if (event.user_id !== userId && !user.is_admin) {
    return Response.json({ message: "forbidden" }, { status: 403 });
  }
  return { event, user } as const;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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

  const auth = await checkOwnerOrAdmin(id, body?.user_id);
  if (auth instanceof Response) return auth;

  if (body?.title) {
    const titleError = requireLength(body.title, 100, "title");
    if (titleError) return titleError;
  }
  if (body?.description) {
    const descError = requireLength(body.description, 1000, "description");
    if (descError) return descError;
  }
  if (body?.start_at) {
    const startAtError = requireIsoDate(body.start_at, "start_at");
    if (startAtError) return startAtError;
  }

  const updated = await updateEvent(id, {
    title: body?.title,
    category: body?.category,
    description: body?.description,
    start_at: body?.start_at,
    send_realtime: body?.send_realtime,
    recurrence_rule: body?.recurrence_rule,
  });

  if (!updated) {
    return Response.json({ message: "event not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { user_id?: string; turnstile_token?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const turnstileError = await requireTurnstile(body?.turnstile_token);
  if (turnstileError) return turnstileError;

  const rateLimitError = requireRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const auth = await checkOwnerOrAdmin(id, body?.user_id);
  if (auth instanceof Response) return auth;

  const ok = await deleteEvent(id);
  if (!ok) {
    return Response.json({ message: "event not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
