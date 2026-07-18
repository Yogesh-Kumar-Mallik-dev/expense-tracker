import { z } from "zod";
import { requireUser } from "../../../../../src/auth";
import { body, ok, route } from "../../../../../src/http";
import { requestEmailChange } from "../../../../../src/email-change";

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const userId = await requireUser(request);
  const { email } = z.object({ email: z.email() }).parse(await body(request));
  return ok(await requestEmailChange(userId, email), 202);
});
