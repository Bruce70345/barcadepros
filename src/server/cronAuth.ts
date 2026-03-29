export function requireCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) {
    return Response.json(
      { message: "cron_secret_missing" },
      { status: 500 }
    );
  }
  const actual = request.headers.get("x-cron-secret") || "";
  if (!actual || actual !== expected) {
    return Response.json(
      { message: "forbidden" },
      { status: 403 }
    );
  }
  return null;
}
