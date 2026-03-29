import { listDevices } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id") || undefined;
  const onlyActive = searchParams.get("active") !== "false";
  const devices = await listDevices(user_id);
  const filtered = onlyActive ? devices.filter((d) => d.is_active) : devices;
  return Response.json(filtered, { status: 200 });
}
