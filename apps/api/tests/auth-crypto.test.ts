import assert from "node:assert/strict";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import {
  hashPassword,
  hashToken,
  signToken,
  signRs256Token,
  publicJwk,
  verifyPassword,
  verifyToken,
} from "../src/auth/crypto";

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(
    await verifyPassword("correct horse battery staple", first),
    true,
  );
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("signed tokens reject tampering and the wrong token type", () => {
  const secret = "a".repeat(32);
  const token = signToken(
    {
      sub: "018f92e5-8f2d-7d2a-a6df-93c09d652a35",
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 60,
    },
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

test("PowerSync tokens use a matching RS256 JWKS key", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privatePem = privateKey
    .export({
      format: "pem",
      type: "pkcs8",
    })
    .toString();
  const token = signRs256Token(
    {
      sub: "018f92e5-8f2d-7d2a-a6df-93c09d652a35",
      aud: "https://powersync.example.test",
      iat: 1_000,
      exp: 1_300,
    },
    privatePem,
    "powersync-key-1",
  );
  const [header, payload, signature] = token.split(".");
  assert.ok(header && payload && signature);
  assert.deepEqual(
    JSON.parse(Buffer.from(header, "base64url").toString("utf8")),
    { alg: "RS256", typ: "JWT", kid: "powersync-key-1" },
  );
  assert.equal(
    verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      createPublicKey(privateKey),
      Buffer.from(signature, "base64url"),
    ),
    true,
  );
  const jwk = publicJwk(privatePem, "powersync-key-1");
  assert.equal(jwk.kty, "RSA");
  assert.equal(jwk.kid, "powersync-key-1");
  assert.equal("d" in jwk, false);
});
