import { upsertUser } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";

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

  const record = await upsertUser({ name, email: body?.email });
  return Response.json(record, { status: 200 });
}
