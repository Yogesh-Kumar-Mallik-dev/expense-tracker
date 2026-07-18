import { z } from "zod";
import { rotateRefreshToken } from "../../../../src/auth";
import { body, ok, route } from "../../../../src/http";

const schema = z.object({ refreshToken: z.string().min(1) });

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const { refreshToken } = schema.parse(await body(request));
  return ok({ tokens: await rotateRefreshToken(refreshToken) });
});
