import { z } from "zod";
import { requireUser } from "../../../../src/auth";
import { HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const url = new URL(request.url);
  const parsed = z
    .object({ from: z.iso.datetime(), to: z.iso.datetime() })
    .safeParse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
  if (!parsed.success)
    throw new HttpError(400, "INVALID_PERIOD", "from and to are required");
  return ok(
    await services.reporting.categorySpending(
      userId,
      parsed.data.from,
      parsed.data.to,
    ),
  );
});
