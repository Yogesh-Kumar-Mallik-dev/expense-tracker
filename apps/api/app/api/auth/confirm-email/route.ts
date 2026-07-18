import { z } from "zod";
import { body, ok, route } from "../../../../src/http";
import { confirmEmailChange } from "../../../../src/email-change";

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const { token } = z
    .object({ token: z.string().min(32) })
    .parse(await body(request));
  return ok(await confirmEmailChange(token));
});
