import { prisma } from "@expense-tracker/db-main";
import { ok, route } from "../../../src/http";

export const runtime = "nodejs";
export const GET = route(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ status: "ok" });
});
