import { requireUser } from "../../../../../src/auth";
import { HttpError, ok, route } from "../../../../../src/http";
import { services } from "../../../../../src/services";
import { createDownloadUrl } from "../../../../../src/storage";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const GET = route(async (request: Request, context: Context) => {
  const userId = await requireUser(request);
  const attachment = await services.attachments.get(
    (await context.params).id,
    userId,
  );
  if (!attachment) {
    throw new HttpError(404, "NOT_FOUND", "Attachment not found");
  }
  return ok({
    downloadUrl: await createDownloadUrl(
      attachment.storageKey,
      attachment.fileName,
    ),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
});
