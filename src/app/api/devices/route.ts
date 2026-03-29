import { listDevices } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id") || undefined;
  const devices = await listDevices(user_id);
  return Response.json(devices, { status: 200 });
}
