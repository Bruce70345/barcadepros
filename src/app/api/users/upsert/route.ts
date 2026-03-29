import { upsertUserByEmail } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; name?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const email = body?.email?.trim();
  if (!email) {
    return Response.json({ message: "email is required" }, { status: 400 });
  }

  const record = await upsertUserByEmail({ email, name: body?.name });
  return Response.json(record, { status: 200 });
}
