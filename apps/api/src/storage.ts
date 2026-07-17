import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import { HttpError } from "./http";

const URL_SECONDS = 10 * 60;

function configuration(): ReturnType<typeof env> & {
  ATTACHMENT_BUCKET: string;
  ATTACHMENT_REGION: string;
} {
  const value = env();
  if (!value.ATTACHMENT_BUCKET || !value.ATTACHMENT_REGION) {
    throw new HttpError(
      503,
      "ATTACHMENT_STORAGE_NOT_CONFIGURED",
      "Attachment object storage is not configured",
    );
  }
  return value as ReturnType<typeof env> & {
    ATTACHMENT_BUCKET: string;
    ATTACHMENT_REGION: string;
  };
}

function client() {
  const value = configuration();
  return new S3Client({
    region: value.ATTACHMENT_REGION,
    ...(value.ATTACHMENT_ENDPOINT
      ? {
          endpoint: value.ATTACHMENT_ENDPOINT,
          forcePathStyle: value.ATTACHMENT_FORCE_PATH_STYLE,
        }
      : {}),
    ...(value.ATTACHMENT_ACCESS_KEY_ID && value.ATTACHMENT_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: value.ATTACHMENT_ACCESS_KEY_ID,
            secretAccessKey: value.ATTACHMENT_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
}

export function attachmentStorageKey(input: {
  userId: string;
  transactionId: string;
  attachmentId: string;
  fileName: string;
}) {
  const originalName =
    input.fileName.normalize("NFKC").split(/[\\/]/).pop() ?? "attachment";
  const safeName =
    originalName
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 120) || "attachment";
  return `users/${input.userId}/transactions/${input.transactionId}/${input.attachmentId}/${safeName}`;
}

export async function createUploadUrl(input: {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
}) {
  const value = configuration();
  const command = new PutObjectCommand({
    Bucket: value.ATTACHMENT_BUCKET,
    Key: input.storageKey,
    ContentType: input.mimeType,
    ...(input.checksumSha256 ? { ChecksumSHA256: input.checksumSha256 } : {}),
  });
  const uploadUrl = await getSignedUrl(client(), command, {
    expiresIn: URL_SECONDS,
    signableHeaders: new Set(["content-type"]),
    ...(input.checksumSha256
      ? { unhoistableHeaders: new Set(["x-amz-checksum-sha256"]) }
      : {}),
  });
  return {
    uploadUrl,
    expiresAt: new Date(Date.now() + URL_SECONDS * 1000).toISOString(),
  };
}

export async function verifyUploadedObject(input: {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const value = configuration();
  let result;
  try {
    result = await client().send(
      new HeadObjectCommand({
        Bucket: value.ATTACHMENT_BUCKET,
        Key: input.storageKey,
      }),
    );
  } catch {
    throw new HttpError(
      409,
      "ATTACHMENT_UPLOAD_INCOMPLETE",
      "The uploaded object could not be verified",
    );
  }
  if (result.ContentLength !== input.sizeBytes) {
    throw new HttpError(
      409,
      "ATTACHMENT_SIZE_MISMATCH",
      "Uploaded object size does not match the declared size",
    );
  }
  if (
    result.ContentType &&
    result.ContentType.toLowerCase() !== input.mimeType.toLowerCase()
  ) {
    throw new HttpError(
      409,
      "ATTACHMENT_TYPE_MISMATCH",
      "Uploaded object type does not match the declared type",
    );
  }
}

export async function createDownloadUrl(storageKey: string, fileName: string) {
  const value = configuration();
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: value.ATTACHMENT_BUCKET,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${fileName.replaceAll('"', "")}"`,
    }),
    { expiresIn: URL_SECONDS },
  );
}
