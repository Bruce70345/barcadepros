import {
  deleteEvent,
  deleteEventsInSeriesFrom,
  getEventById,
  getUserById,
  updateEvent,
  updateEventsInSeriesFrom,
} from "@/server/appStore";
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
        location?: string;
        description?: string;
        start_at?: string;
        send_realtime?: boolean;
        recurrence_rule?: string;
        turnstile_token?: string;
        series_action?: "single" | "rest";
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
  if (body?.location) {
    const locationError = requireLength(body.location, 200, "location");
    if (locationError) return locationError;
  }
  if (body?.start_at) {
    const startAtError = requireIsoDate(body.start_at, "start_at");
    if (startAtError) return startAtError;
  }

  const seriesAction = body?.series_action === "rest" ? "rest" : "single";

  if (seriesAction === "rest" && auth.event.recurrence_rule) {
    const seriesId = auth.event.recurrence_rule
      .split(";")
      .find((part) => part.startsWith("SERIES="))
      ?.replace("SERIES=", "");
    if (seriesId) {
      await updateEventsInSeriesFrom({
        series_id: seriesId,
        from_start_at: auth.event.start_at,
        updates: {
          title: body?.title,
          category: body?.category,
          location: body?.location,
          description: body?.description,
          start_at: body?.start_at,
          send_realtime: body?.send_realtime,
          recurrence_rule: body?.recurrence_rule,
        },
      });
    } else {
      const updated = await updateEvent(id, {
        title: body?.title,
        category: body?.category,
        location: body?.location,
        description: body?.description,
        start_at: body?.start_at,
        send_realtime: body?.send_realtime,
        recurrence_rule: body?.recurrence_rule,
      });

      if (!updated) {
        return Response.json({ message: "event not found" }, { status: 404 });
      }
    }
  } else {
    const updated = await updateEvent(id, {
      title: body?.title,
      category: body?.category,
      location: body?.location,
      description: body?.description,
      start_at: body?.start_at,
      send_realtime: body?.send_realtime,
      recurrence_rule: body?.recurrence_rule,
    });

    if (!updated) {
      return Response.json({ message: "event not found" }, { status: 404 });
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body:
    | { user_id?: string; turnstile_token?: string; series_action?: "single" | "rest" }
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

  const seriesAction = body?.series_action === "rest" ? "rest" : "single";

  if (seriesAction === "rest" && auth.event.recurrence_rule) {
    const seriesId = auth.event.recurrence_rule
      .split(";")
      .find((part) => part.startsWith("SERIES="))
      ?.replace("SERIES=", "");
    if (seriesId) {
      await deleteEventsInSeriesFrom({
        series_id: seriesId,
        from_start_at: auth.event.start_at,
      });
    } else {
      const ok = await deleteEvent(id);
      if (!ok) {
        return Response.json({ message: "event not found" }, { status: 404 });
      }
    }
  } else {
    const ok = await deleteEvent(id);
    if (!ok) {
      return Response.json({ message: "event not found" }, { status: 404 });
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
