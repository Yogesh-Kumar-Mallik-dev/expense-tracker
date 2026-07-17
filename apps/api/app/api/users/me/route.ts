import { requireUser } from "../../../../src/auth";
import { body, empty, HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";

export const runtime = "nodejs";
export const GET = route(async (request: Request) => {
  const userId = await requireUser(request);
  const user = await services.users.get(userId, userId);
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
  return ok(user);
});
export const PATCH = route(async (request: Request) => {
  const userId = await requireUser(request);
  await services.users.update(userId, userId, await body(request));
  return empty();
});
export const DELETE = route(async (request: Request) => {
  const userId = await requireUser(request);
  await services.users.delete(userId, userId);
  return empty();
});
