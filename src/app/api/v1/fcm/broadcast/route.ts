import { getAdminMessaging } from "@/server/firebaseAdmin";
import { listTokens } from "@/server/pushTokenStore";

type Payload = {
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

  const tokens = listTokens().map((t) => t.token);
  if (tokens.length === 0) {
    return Response.json(
      { ok: true, sent: 0, message: "no tokens registered" },
      { status: 200 }
    );
  }

  const notification = {
    title: body?.title || "BarcadePro 測試通知",
    body: body?.body || "這是一則測試推播訊息",
  };

  const data = body?.data || { tag: `broadcast-${Date.now()}` };

  try {
    const messaging = getAdminMessaging();
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification,
      data,
    });

    return Response.json(
      {
        ok: true,
        sent: tokens.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return Response.json(
      { message: "FCM send failed", detail: error?.message || error },
      { status: 500 }
    );
  }
}
