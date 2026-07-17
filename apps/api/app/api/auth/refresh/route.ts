import { z } from "zod";
import { issueTokens, rotateRefreshToken } from "../../../../src/auth";
import { body, ok, route } from "../../../../src/http";

const schema = z.object({ refreshToken: z.string().min(1) });

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const { refreshToken } = schema.parse(await body(request));
  const current = await rotateRefreshToken(refreshToken);
  return ok({ tokens: await issueTokens(current.userId, current.deviceId) });
});
