import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../apps/api/src/http";
import { paginate } from "../../apps/api/src/pagination";
import {
  checkRateLimit,
  resetRateLimitsForTests,
  setRateLimitStoreForTests,
  type RateLimitStore,
} from "../../apps/api/src/rate-limit";

test("pagination returns bounded data and navigation metadata", () => {
  const result = paginate(
    Array.from({ length: 52 }, (_, index) => index + 1),
    new URL("https://api.example.test/api/accounts?page=2&pageSize=25"),
  );
  assert.deepEqual(
    result.data,
    Array.from({ length: 25 }, (_, index) => index + 26),
  );
  assert.deepEqual(result.meta, {
    page: 2,
    pageSize: 25,
    total: 52,
    totalPages: 3,
    hasNext: true,
    hasPrevious: true,
  });
});

test("pagination rejects invalid and excessive page sizes", () => {
  assert.throws(
    () => paginate([], new URL("https://api.example.test/api/accounts?page=0")),
    (error) =>
      error instanceof HttpError && error.code === "INVALID_PAGINATION",
  );
  assert.throws(
    () =>
      paginate(
        [],
        new URL("https://api.example.test/api/accounts?pageSize=101"),
      ),
    (error) =>
      error instanceof HttpError && error.code === "INVALID_PAGINATION",
  );
  assert.throws(
    () =>
      paginate(
        [],
        new URL(
          "https://api.example.test/api/accounts?page=999999999999999999999",
        ),
      ),
    (error) =>
      error instanceof HttpError && error.code === "INVALID_PAGINATION",
  );
});

test("authentication routes use the strict rate-limit policy", async () => {
  await resetRateLimitsForTests();
  const request = new Request("https://api.example.test/api/auth/login", {
    headers: { "x-forwarded-for": "192.0.2.10" },
  });
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const result = await checkRateLimit(request, 1_000, true);
    assert.equal(result.allowed, true);
    assert.equal(result.limit, 10);
    assert.equal(result.remaining, 10 - attempt);
  }
  const rejected = await checkRateLimit(request, 1_000, true);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfter, 60);
});

test("rate-limit buckets reset after the window", async () => {
  await resetRateLimitsForTests();
  const request = new Request("https://api.example.test/api/accounts", {
    headers: { "x-real-ip": "192.0.2.20" },
  });
  assert.equal((await checkRateLimit(request, 1_000, true)).remaining, 119);
  assert.equal((await checkRateLimit(request, 61_001, true)).remaining, 119);
});

test("forwarding headers do not select buckets unless proxy trust is enabled", async () => {
  await resetRateLimitsForTests();
  const first = new Request("https://api.example.test/api/accounts", {
    headers: { "x-forwarded-for": "192.0.2.1" },
  });
  const spoofed = new Request("https://api.example.test/api/accounts", {
    headers: { "x-forwarded-for": "192.0.2.2" },
  });
  assert.equal((await checkRateLimit(first, 1_000, false)).remaining, 119);
  assert.equal((await checkRateLimit(spoofed, 1_000, false)).remaining, 118);
  await resetRateLimitsForTests();
  assert.equal((await checkRateLimit(first, 1_000, true)).remaining, 119);
  assert.equal((await checkRateLimit(spoofed, 1_000, true)).remaining, 119);
});

test("rate limiting supports one shared atomic production store", async () => {
  const counts = new Map<string, number>();
  const store: RateLimitStore = {
    async consume(key, limit, windowMs, now) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: now + windowMs,
      };
    },
    reset() {
      counts.clear();
    },
  };
  setRateLimitStoreForTests(store);
  const request = new Request("https://api.example.test/api/accounts", {
    headers: { "x-forwarded-for": "192.0.2.50" },
  });

  assert.equal((await checkRateLimit(request, 1_000, true)).remaining, 119);
  assert.equal((await checkRateLimit(request, 1_000, true)).remaining, 118);
  assert.equal(counts.size, 1);
  await resetRateLimitsForTests();
});
