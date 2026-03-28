import { deleteById, updateById } from "@/server/pushTokenStore";

type Params = { id: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  let body:
    | { token?: string; platform?: string; deviceInfo?: unknown }
    | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const updated = updateById(id, {
    token: body?.token,
    platform: body?.platform,
    deviceInfo: body?.deviceInfo as any,
  });

  if (!updated) {
    return Response.json({ message: "not found" }, { status: 404 });
  }

  return Response.json(updated, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const deleted = deleteById(id);

  if (!deleted) {
    return Response.json({ message: "not found" }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
