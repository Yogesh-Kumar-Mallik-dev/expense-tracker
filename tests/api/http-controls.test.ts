import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../../apps/api/src/http";
import { paginate } from "../../apps/api/src/pagination";
import {
  checkRateLimit,
  resetRateLimitsForTests,
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
});

test("authentication routes use the strict rate-limit policy", () => {
  resetRateLimitsForTests();
  const request = new Request("https://api.example.test/api/auth/login", {
    headers: { "x-forwarded-for": "192.0.2.10" },
  });
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const result = checkRateLimit(request, 1_000);
    assert.equal(result.allowed, true);
    assert.equal(result.limit, 10);
    assert.equal(result.remaining, 10 - attempt);
  }
  const rejected = checkRateLimit(request, 1_000);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.retryAfter, 60);
});

test("rate-limit buckets reset after the window", () => {
  resetRateLimitsForTests();
  const request = new Request("https://api.example.test/api/accounts", {
    headers: { "x-real-ip": "192.0.2.20" },
  });
  assert.equal(checkRateLimit(request, 1_000).remaining, 119);
  assert.equal(checkRateLimit(request, 61_001).remaining, 119);
});
