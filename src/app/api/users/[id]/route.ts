import { getUserById } from "@/server/appStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getUserById(id);
  if (!user) {
    return Response.json({ message: "user not found" }, { status: 404 });
  }
  return Response.json(user, { status: 200 });
}
