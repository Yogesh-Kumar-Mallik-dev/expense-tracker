import { requireUser } from "../../../../src/auth";
import { signRs256Token } from "../../../../src/auth/crypto";
import { env } from "../../../../src/env";
import { HttpError, ok, route } from "../../../../src/http";
export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const configuration = env();
  if (
    !configuration.POWERSYNC_URL ||
    !configuration.POWERSYNC_PRIVATE_KEY_BASE64
  ) {
    throw new HttpError(
      503,
      "POWERSYNC_NOT_CONFIGURED",
      "PowerSync credentials are not configured",
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const audience =
    configuration.POWERSYNC_AUDIENCE ?? configuration.POWERSYNC_URL;
  return ok({
    endpoint: configuration.POWERSYNC_URL,
    token: signRs256Token(
      {
        sub: userId,
        aud: audience,
        iss: configuration.POWERSYNC_ISSUER ?? "expense-tracker-api",
        iat: now,
        exp: now + 5 * 60,
      },
      Buffer.from(
        configuration.POWERSYNC_PRIVATE_KEY_BASE64,
        "base64",
      ).toString("utf8"),
      configuration.POWERSYNC_KEY_ID,
    ),
  });
});
