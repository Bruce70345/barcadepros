import { NextRequest, NextResponse } from "next/server";
import { POST as sendDigest } from "@/app/api/notifications/send-digest/route";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const secret = bearer || headerSecret;
  if (!expected || secret !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const forwardHeaders = new Headers();
  forwardHeaders.set("x-cron-secret", secret);

  const forwardRequest = new Request(req.url, {
    method: "POST",
    headers: forwardHeaders,
    body: JSON.stringify({}),
  });

  return sendDigest(forwardRequest);
}
