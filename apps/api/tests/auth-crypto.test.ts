import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  hashToken,
  signToken,
  verifyPassword,
  verifyToken,
} from "../src/auth/crypto";

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("signed tokens reject tampering and the wrong token type", () => {
  const secret = "a".repeat(32);
  const token = signToken(
    { sub: "018f92e5-8f2d-7d2a-a6df-93c09d652a35", type: "access", exp: Math.floor(Date.now() / 1000) + 60 },
    secret,
  );
  assert.equal(verifyToken(token, secret, "access")?.type, "access");
  assert.equal(verifyToken(token, secret, "refresh"), null);
  assert.equal(verifyToken(`${token}x`, secret, "access"), null);
});

test("refresh-token hashes are deterministic without retaining the token", () => {
  assert.equal(hashToken("token"), hashToken("token"));
  assert.notEqual(hashToken("token"), "token");
});
