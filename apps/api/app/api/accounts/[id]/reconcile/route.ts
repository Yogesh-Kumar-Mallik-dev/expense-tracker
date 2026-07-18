import { requireUser } from "../../../../../src/auth";
import { body, ok, route } from "../../../../../src/http";
import { reconcileAccount } from "../../../../../src/phase4";

type Context = { params: Promise<{ id: string }> };
export const POST = route(async (request: Request, context: Context) =>
  ok(
    await reconcileAccount(
      await requireUser(request),
      (await context.params).id,
      await body(request),
    ),
    201,
  ),
);
