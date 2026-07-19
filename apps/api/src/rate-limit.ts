import { createClient, type RedisClientType } from "redis";

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

export interface RateLimitStore {
  consume(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): Promise<Pick<RateLimitResult, "allowed" | "remaining" | "resetAt">>;
  reset?(): Promise<void> | void;
}

const WINDOW_MS = 60_000;

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private lastCleanup = 0;

  async consume(key: string, limit: number, windowMs: number, now: number) {
    if (now - this.lastCleanup >= windowMs) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(bucketKey);
      }
      this.lastCleanup = now;
    }
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  reset() {
    this.buckets.clear();
    this.lastCleanup = 0;
  }
}

class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClientType | null = null;
  private connecting: Promise<RedisClientType> | null = null;

  constructor(private readonly url: string) {}

  private connection() {
    if (this.client?.isReady) return Promise.resolve(this.client);
    if (this.connecting) return this.connecting;
    const client = createClient({ url: this.url });
    this.connecting = client
      .connect()
      .then(() => {
        this.client = client as RedisClientType;
        return this.client;
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }

  async consume(key: string, limit: number, windowMs: number, now: number) {
    const client = await this.connection();
    const result = (await client.eval(
      `local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}`,
      {
        keys: [key],
        arguments: [String(windowMs)],
      },
    )) as [number, number];
    const [count, ttl] = result;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + Math.max(1, ttl),
    };
  }
}

const memoryStore = new MemoryRateLimitStore();
let testStore: RateLimitStore | null = null;
let redisStore: RedisRateLimitStore | null = null;

function requestIdentity(request: Request, trustProxy: boolean) {
  if (!trustProxy) return "direct";
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function policy(url: URL) {
  if (url.pathname.startsWith("/api/auth/")) return { name: "auth", limit: 10 };
  if (url.pathname === "/api/powersync/upload")
    return { name: "powersync-upload", limit: 30 };
  if (url.pathname === "/api/health") return { name: "health", limit: 300 };
  return { name: "api", limit: 120 };
}

function configuredStore() {
  if (testStore) return testStore;
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisStore ??= new RedisRateLimitStore(redisUrl);
    return redisStore;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("REDIS_URL is required for production rate limiting");
  return memoryStore;
}

export async function checkRateLimit(
  request: Request,
  now = Date.now(),
  trustProxy = process.env.TRUST_PROXY === "true",
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "production" && !trustProxy)
    throw new Error(
      "TRUST_PROXY must be enabled behind the production ingress proxy",
    );
  const selected = policy(new URL(request.url));
  const key = `expense-tracker:rate-limit:${selected.name}:${requestIdentity(request, trustProxy)}`;
  const consumed = await configuredStore().consume(
    key,
    selected.limit,
    WINDOW_MS,
    now,
  );
  return {
    ...consumed,
    limit: selected.limit,
    retryAfter: Math.max(1, Math.ceil((consumed.resetAt - now) / 1000)),
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

export function setRateLimitStoreForTests(store: RateLimitStore | null) {
  testStore = store;
}

export async function resetRateLimitsForTests() {
  await (testStore ?? memoryStore).reset?.();
  testStore = null;
}
