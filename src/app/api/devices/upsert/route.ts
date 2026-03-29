import { upsertDevice } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body:
    | { user_id?: string; fcm_token?: string; platform?: string }
    | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body?.user_id) {
    return Response.json({ message: "user_id is required" }, { status: 400 });
  }
  if (!body?.fcm_token) {
    return Response.json({ message: "fcm_token is required" }, { status: 400 });
  }

  const record = await upsertDevice({
    user_id: body.user_id,
    fcm_token: body.fcm_token,
    platform: body.platform,
  });

  return Response.json({ id: record.id, is_active: record.is_active }, { status: 200 });
}
