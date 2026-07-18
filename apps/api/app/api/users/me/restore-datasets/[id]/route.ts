import { prisma } from "@expense-tracker/db-main";
import { requireUser } from "../../../../../../src/auth";
import { HttpError, ok, route } from "../../../../../../src/http";

type Context = { params: Promise<{ id: string }> };
export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const dataset = await prisma.restoreDataset.findFirst({
    where: { id: (await context.params).id, userId, status: "READY" },
  });
  if (!dataset)
    throw new HttpError(404, "NOT_FOUND", "Restore dataset was not found");
  return ok(dataset.snapshot);
});
