import { requireUser } from "../../../../../src/auth";
import { HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const POST = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  try {
    return ok(
      await services.transactions.restore((await context.params).id, userId),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Transaction could not be restored"
    )
      throw new HttpError(
        404,
        "NOT_FOUND",
        "Deleted transaction was not found",
      );
    throw error;
  }
});
