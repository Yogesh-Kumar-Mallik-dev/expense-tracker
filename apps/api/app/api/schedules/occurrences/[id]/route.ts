import { requireUser } from "../../../../../src/auth";
import { body, ok, route } from "../../../../../src/http";
import { resolveOccurrence } from "../../../../../src/phase4";

type Context = { params: Promise<{ id: string }> };
export const POST = route(async (request: Request, context: Context) => {
  const input = await body(request);
  if (input.action !== "POSTED" && input.action !== "SKIPPED")
    throw new Error("action must be POSTED or SKIPPED");
  return ok(
    await resolveOccurrence(
      await requireUser(request),
      (await context.params).id,
      input.action,
    ),
  );
});
