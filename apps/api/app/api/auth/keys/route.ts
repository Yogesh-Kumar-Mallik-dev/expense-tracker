import { publicJwk } from "../../../../src/auth/crypto";
import { env } from "../../../../src/env";
import { HttpError, route } from "../../../../src/http";

export const runtime = "nodejs";
export const GET = route(async () => {
  const configuration = env();
  if (!configuration.POWERSYNC_PRIVATE_KEY_BASE64) {
    throw new HttpError(
      503,
      "POWERSYNC_NOT_CONFIGURED",
      "PowerSync signing keys are not configured",
    );
  }
  const key = publicJwk(
    Buffer.from(configuration.POWERSYNC_PRIVATE_KEY_BASE64, "base64").toString(
      "utf8",
    ),
    configuration.POWERSYNC_KEY_ID,
  );
  return Response.json(
    { keys: [key] },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
      },
    },
  );
});
