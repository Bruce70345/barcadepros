import { updateUserPreferences } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  let body:
    | {
        user_id?: string;
        receive_realtime?: boolean;
        receive_digest?: boolean;
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

  if (!body?.user_id) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }

  if (
    typeof body.receive_realtime === "undefined" &&
    typeof body.receive_digest === "undefined"
  ) {
    return Response.json(
      { message: "receive_realtime or receive_digest is required" },
      { status: 400 }
    );
  }

  const rateLimitError = requireRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const updated = await updateUserPreferences({
    user_id: body.user_id,
    receive_realtime: body.receive_realtime,
    receive_digest: body.receive_digest,
  });

  if (!updated) {
    return Response.json({ message: "user not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
