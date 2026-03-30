import { NextRequest, NextResponse } from "next/server";
import { POST as sendDigest } from "@/app/api/notifications/send-digest/route";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const forwardHeaders = new Headers();
  if (auth) {
    forwardHeaders.set("authorization", auth);
  }

  const forwardRequest = new Request(req.url, {
    method: "POST",
    headers: forwardHeaders,
    body: JSON.stringify({}),
  });

  return sendDigest(forwardRequest);
}
