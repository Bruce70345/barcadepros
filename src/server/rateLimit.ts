const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 10;

type Bucket = {
  count: number;
  resetAt: number;
};

const STORE_KEY = "__barcadepro_rate_limit__";

function getStore(): Map<string, Bucket> {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, Bucket> };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY]!;
}

function getClientIp(request: Request): string {
  const header = request.headers.get("x-forwarded-for") || "";
  const ip = header.split(",")[0]?.trim();
  return ip || "unknown";
}

export function checkRateLimit(
  request: Request,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = WINDOW_MS
) {
  const ip = getClientIp(request);
  const key = `${ip}`;
  const now = Date.now();
  const store = getStore();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  store.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(limit - bucket.count, 0),
    resetAt: bucket.resetAt,
  };
}

export function requireRateLimit(request: Request, limit?: number) {
  const result = checkRateLimit(request, limit);
  if (!result.allowed) {
    return Response.json(
      { message: "rate_limited", resetAt: result.resetAt },
      { status: 429 }
    );
  }
  return null;
}
