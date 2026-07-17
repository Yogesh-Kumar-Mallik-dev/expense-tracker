import { requireUser } from "../../../../src/auth";
import { body, empty, route } from "../../../../src/http";
import { applyUpload, uploadSchema } from "../../../../src/powersync";
export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const userId = await requireUser(request);
  await applyUpload(uploadSchema.parse(await body(request)), userId);
  return empty();
});
