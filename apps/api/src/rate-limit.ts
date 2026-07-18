interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();
let lastCleanup = 0;

function requestIdentity(request: Request, trustProxy: boolean) {
  if (!trustProxy) return "direct";
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const ip =
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  return ip;
}

function policy(url: URL) {
  if (url.pathname.startsWith("/api/auth/")) return { name: "auth", limit: 10 };
  if (url.pathname === "/api/powersync/upload") {
    return { name: "powersync-upload", limit: 30 };
  }
  if (url.pathname === "/api/health") return { name: "health", limit: 300 };
  return { name: "api", limit: 120 };
}

export function checkRateLimit(
  request: Request,
  now = Date.now(),
  trustProxy = process.env.TRUST_PROXY === "true",
): RateLimitResult {
  if (now - lastCleanup >= WINDOW_MS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    lastCleanup = now;
  }

  const selected = policy(new URL(request.url));
  const key = `${selected.name}:${requestIdentity(request, trustProxy)}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const remaining = Math.max(0, selected.limit - bucket.count);
  return {
    allowed: bucket.count <= selected.limit,
    limit: selected.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function resetRateLimitsForTests() {
  buckets.clear();
  lastCleanup = 0;
}
