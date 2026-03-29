import { updateDeviceStatus } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { is_active?: boolean } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (typeof body?.is_active === "undefined") {
    return Response.json({ message: "is_active is required" }, { status: 400 });
  }

  const updated = await updateDeviceStatus(id, { is_active: body.is_active });
  if (!updated) {
    return Response.json({ message: "device not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const updated = await updateDeviceStatus(id, { is_active: false });
  if (!updated) {
    return Response.json({ message: "device not found" }, { status: 404 });
  }
  return Response.json({ ok: true }, { status: 200 });
}
