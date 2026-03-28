import { createOrUpdateByToken } from "@/server/pushTokenStore";

export async function POST(request: Request) {
  let body: { token?: string; platform?: string; deviceInfo?: unknown } | null =
    null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body?.token) {
    return Response.json(
      { message: "token is required" },
      { status: 400 }
    );
  }

  const record = createOrUpdateByToken({
    token: body.token,
    platform: body.platform,
    deviceInfo: body.deviceInfo as any,
  });

  return Response.json(record, { status: 201 });
}
