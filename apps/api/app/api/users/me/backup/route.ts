import { requireUser } from "../../../../../src/auth";
import { exportUserBackup } from "../../../../../src/backup";
import { ok, route } from "../../../../../src/http";

export const runtime = "nodejs";
export const GET = route(async (request: Request) =>
  ok(await exportUserBackup(await requireUser(request))),
);
