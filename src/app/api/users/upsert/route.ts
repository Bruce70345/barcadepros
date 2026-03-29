import { upsertUser } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";
import { requireLength } from "@/server/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body:
    | { email?: string; name?: string; turnstile_token?: string }
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

  const name = body?.name?.trim();
  if (!name) {
    return Response.json({ message: "name is required" }, { status: 400 });
  }
  const nameError = requireLength(name, 50, "name");
  if (nameError) return nameError;
  if (body?.email) {
    const emailError = requireLength(body.email, 200, "email");
    if (emailError) return emailError;
  }

  const record = await upsertUser({ name, email: body?.email });
  return Response.json(record, { status: 200 });
}
