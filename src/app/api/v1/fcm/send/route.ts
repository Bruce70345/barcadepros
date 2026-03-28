import { getAdminEnvMeta, getAdminMessaging } from "@/server/firebaseAdmin";

type Payload = {
  token?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

export async function POST(request: Request) {
  let body: Payload | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body?.token) {
    return Response.json({ message: "token is required" }, { status: 400 });
  }

  const meta = getAdminEnvMeta();
  console.log("[FCM Admin Env]", meta);

  const notification = {
    title: body.title || "BarcadePro 測試通知",
    body: body.body || "這是一則測試推播訊息",
  };

  const data = body.data || { tag: `send-${Date.now()}` };

  try {
    const messaging = getAdminMessaging();
    const messageId = await messaging.send({
      token: body.token,
      notification,
      data,
    });
    return Response.json({ ok: true, messageId, meta }, { status: 200 });
  } catch (error: any) {
    return Response.json(
      {
        message: "FCM send failed",
        detail: error?.message || error,
        meta,
      },
      { status: 500 }
    );
  }
}
