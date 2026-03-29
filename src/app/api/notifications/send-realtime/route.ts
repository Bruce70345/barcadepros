import { sendRealtimeForEvent } from "@/server/notificationService";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { event_id?: string; turnstile_token?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const turnstileError = await requireTurnstile(body?.turnstile_token);
  if (turnstileError) return turnstileError;

  const rateLimitError = requireRateLimit(request, 1);
  if (rateLimitError) return rateLimitError;

  if (!body?.event_id) {
    return Response.json({ message: "event_id is required" }, { status: 400 });
  }

  const result = await sendRealtimeForEvent(body.event_id);
  if (!result.ok) {
    return Response.json(
      { message: result.message || "send failed", detail: (result as any).detail },
      { status: 500 }
    );
  }
  return Response.json(result, { status: 200 });
}
