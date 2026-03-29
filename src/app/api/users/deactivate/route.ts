import { deactivateDevicesByUser, deactivateUser } from "@/server/appStore";
import { requireRateLimit } from "@/server/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { user_id?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body?.user_id) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }

  const rateLimitError = requireRateLimit(request);
  if (rateLimitError) return rateLimitError;

  const user = await deactivateUser(body.user_id);
  if (!user) {
    return Response.json({ message: "user not found" }, { status: 404 });
  }

  const disabled = await deactivateDevicesByUser(body.user_id);
  return Response.json({ ok: true, disabledDevices: disabled }, { status: 200 });
}
