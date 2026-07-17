import { randomUUID } from "node:crypto";
import { requireUser } from "../../../../src/auth";
import { signToken } from "../../../../src/auth/crypto";
import { env } from "../../../../src/env";
import { HttpError, ok, route } from "../../../../src/http";
export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const configuration = env();
  if (!configuration.POWERSYNC_URL || !configuration.POWERSYNC_TOKEN_SECRET) {
    throw new HttpError(503, "POWERSYNC_NOT_CONFIGURED", "PowerSync credentials are not configured");
  }
  const now = Math.floor(Date.now() / 1000);
  return ok({
    endpoint: configuration.POWERSYNC_URL,
    token: signToken(
      { sub: userId, type: "powersync", exp: now + 5 * 60, jti: randomUUID() },
      configuration.POWERSYNC_TOKEN_SECRET,
    ),
  });
});
