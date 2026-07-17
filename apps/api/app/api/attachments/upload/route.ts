import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "../../../../src/auth";
import { body, HttpError, ok, route } from "../../../../src/http";
import { services } from "../../../../src/services";
import { attachmentStorageKey, createUploadUrl } from "../../../../src/storage";
import { env } from "../../../../src/env";

const schema = z.object({
  attachmentId: z.uuid().optional(),
  transactionId: z.uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/)
    .optional(),
});

export const runtime = "nodejs";
export const POST = route(async (request: Request) => {
  const userId = await requireUser(request);
  const input = schema.parse(await body(request));
  if (input.sizeBytes > env().ATTACHMENT_MAX_BYTES) {
    throw new HttpError(
      413,
      "ATTACHMENT_TOO_LARGE",
      `Attachment exceeds the ${env().ATTACHMENT_MAX_BYTES} byte limit`,
      ["sizeBytes"],
    );
  }
  const transaction = await services.transactions.get(
    input.transactionId,
    userId,
  );
  if (!transaction) {
    throw new HttpError(404, "NOT_FOUND", "Transaction not found");
  }
  const attachmentId = input.attachmentId ?? randomUUID();
  const storageKey = attachmentStorageKey({
    userId,
    transactionId: input.transactionId,
    attachmentId,
    fileName: input.fileName,
  });
  const signed = await createUploadUrl({
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    ...(input.checksumSha256 ? { checksumSha256: input.checksumSha256 } : {}),
  });
  return ok(
    {
      attachmentId,
      storageKey,
      method: "PUT",
      ...signed,
      headers: {
        "content-type": input.mimeType,
        ...(input.checksumSha256
          ? { "x-amz-checksum-sha256": input.checksumSha256 }
          : {}),
      },
    },
    201,
  );
});
