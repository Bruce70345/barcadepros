import { NextRequest, NextResponse } from "next/server";
import { POST as sendDigest } from "@/app/api/notifications/send-digest/route";

export async function GET(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET || "";
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    const headerSecret = req.headers.get("x-cron-secret") || "";
    const secret = bearer || headerSecret;
    if (!expected || secret !== expected) {
      return NextResponse.json({ message: "unauthorized" }, { status: 401 });
    }

    const forwardHeaders = new Headers();
    forwardHeaders.set("x-cron-secret", secret);

    const forwardRequest = new Request(req.url, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify({}),
    });

    return sendDigest(forwardRequest);
  } catch (error: any) {
    console.error("[cron] unexpected error", error);
    return NextResponse.json(
      { message: "cron_failed", detail: error?.message || error },
      { status: 500 }
    );
  }
}
