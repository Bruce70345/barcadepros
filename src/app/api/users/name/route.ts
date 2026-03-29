import { updateUserName } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";
import { requireLength } from "@/server/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  let body: { user_id?: string; name?: string; turnstile_token?: string } | null = null;
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

  const name = body?.name?.trim();
  if (!name) {
    return Response.json({ message: "name is required" }, { status: 400 });
  }
  const nameError = requireLength(name, 50, "name");
  if (nameError) return nameError;

  const updated = await updateUserName({ user_id: body.user_id, name });
  if (!updated) {
    return Response.json({ message: "user not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
