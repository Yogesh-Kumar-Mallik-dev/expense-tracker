import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  sign,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltValue, hashValue] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const actual = (await scrypt(
    password,
    Buffer.from(saltValue, "base64url"),
    expected.length,
  )) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type TokenPayload = {
  sub: string;
  type: "access" | "refresh" | "powersync";
  exp: number;
  iat: number;
  jti?: string;
};

export function signToken(payload: Omit<TokenPayload, "iat">, secret: string) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${claims}`)
    .digest("base64url");
  return `${header}.${claims}.${signature}`;
}

export function verifyToken(
  token: string,
  secret: string,
  type: TokenPayload["type"],
): TokenPayload | null {
  const [header, claims, signature] = token.split(".");
  if (!header || !claims || !signature) return null;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${claims}`)
    .digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(claims, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (
      payload.type !== type ||
      typeof payload.sub !== "string" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function signRs256Token(
  payload: Record<string, unknown>,
  privateKeyPem: string,
  keyId: string,
) {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }),
  ).toString("base64url");
  const claims = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${claims}`),
    createPrivateKey(privateKeyPem),
  ).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

export function publicJwk(privateKeyPem: string, keyId: string) {
  const key = createPublicKey(createPrivateKey(privateKeyPem)).export({
    format: "jwk",
  });
  return { ...key, use: "sig", alg: "RS256", kid: keyId };
}
