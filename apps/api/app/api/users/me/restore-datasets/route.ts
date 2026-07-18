import { prisma } from "@expense-tracker/db-main";
import { requireUser } from "../../../../../src/auth";
import { body, ok, route } from "../../../../../src/http";
import { stageRestore } from "../../../../../src/phase4";

export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  return ok(
    await prisma.restoreDataset.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        schemaVersion: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  );
});

export const POST = route(async (request: Request) => {
  const input = await body(request);
  return ok(
    await stageRestore(
      await requireUser(request),
      typeof input.name === "string" ? input.name : "Restored backup",
      input.backup,
    ),
    201,
  );
});
