import { z } from "zod";
import { requireUser } from "../../../../src/auth";
import { body, HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";
import {
  attachmentStorageKey,
  verifyUploadedObject,
} from "../../../../src/storage";

const schema = z.object({
  attachmentId: z.uuid(),
  transactionId: z.uuid(),
  fileName: z.string().trim().min(1).max(255),
  storageKey: z.string().min(1).max(1024),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive(),
});

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  const expectedKey = attachmentStorageKey({
    userId,
    transactionId: input.transactionId,
    attachmentId: input.attachmentId,
    fileName: input.fileName,
  });
  if (input.storageKey !== expectedKey) {
    throw new HttpError(
      403,
      "ATTACHMENT_KEY_INVALID",
      "Attachment storage key is not valid for this user",
    );
  }
  const transaction = await services.transactions.get(
    input.transactionId,
    userId,
  );
  if (!transaction) {
    throw new HttpError(404, "NOT_FOUND", "Transaction not found");
  }
  await verifyUploadedObject(input);
  const existing = await services.attachments.get(input.attachmentId, userId);
  if (existing) return ok(existing);
  const attachment = await services.attachments.create({
    id: input.attachmentId,
    userId,
    transactionId: input.transactionId,
    fileName: input.fileName,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  return ok(attachment, 201);
});
