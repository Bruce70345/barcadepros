import { sendRealtimeForBingoLine } from "@/server/notificationService";
import { requireRateLimit } from "@/server/rateLimit";
import { requireTurnstile } from "@/server/turnstile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body:
    | {
        lines?: number;
        total_lines?: number;
        user_name?: string;
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

  const rateLimitError = requireRateLimit(request, 5);
  if (rateLimitError) return rateLimitError;

  const totalLines =
    typeof body?.total_lines === "number" ? body.total_lines : Number(body?.total_lines ?? 0);
  const fallbackLines = Number(body?.lines ?? 0);
  const resolvedTotal = Number.isFinite(totalLines) && totalLines > 0 ? totalLines : fallbackLines;

  if (!Number.isFinite(resolvedTotal) || resolvedTotal <= 0 || resolvedTotal > 10) {
    return Response.json({ message: "total_lines is invalid" }, { status: 400 });
  }

  const userName =
    typeof body?.user_name === "string" ? body.user_name.trim() : "";
  if (userName.length > 50) {
    return Response.json({ message: "user_name is too long" }, { status: 400 });
  }

  const result = await sendRealtimeForBingoLine(resolvedTotal, userName || undefined);
  if (!result.ok) {
    return Response.json(
      { message: result.message || "send failed", detail: (result as any).detail },
      { status: 500 },
    );
  }
  return Response.json(result, { status: 200 });
}
