import assert from "node:assert/strict";
import test from "node:test";
import {
  attachmentStorageKey,
  createDownloadUrl,
  createUploadUrl,
} from "../src/storage";

test("attachment keys are user-scoped and sanitize hostile filenames", () => {
  const key = attachmentStorageKey({
    userId: "018f92e5-8f2d-7d2a-a6df-93c09d652a35",
    transactionId: "018f92e5-8f2d-7d2a-a6df-93c09d652a36",
    attachmentId: "018f92e5-8f2d-7d2a-a6df-93c09d652a37",
    fileName: "../../my receipt (final).jpg",
  });
  assert.equal(
    key,
    "users/018f92e5-8f2d-7d2a-a6df-93c09d652a35/transactions/018f92e5-8f2d-7d2a-a6df-93c09d652a36/018f92e5-8f2d-7d2a-a6df-93c09d652a37/my_receipt_final_.jpg",
  );
  assert.equal(key.includes("../"), false);
});

test("S3-compatible upload and download URLs are signed without network access", async () => {
  Object.assign(process.env, {
    DATABASE_URL: "postgresql://user:password@localhost:5432/expense_tracker",
    ACCESS_TOKEN_SECRET: "a".repeat(32),
    REFRESH_TOKEN_SECRET: "b".repeat(32),
    ATTACHMENT_BUCKET: "expense-tracker-test",
    ATTACHMENT_REGION: "us-east-1",
    ATTACHMENT_ENDPOINT: "https://objects.example.test",
    ATTACHMENT_FORCE_PATH_STYLE: "true",
    ATTACHMENT_ACCESS_KEY_ID: "test-access-key",
    ATTACHMENT_SECRET_ACCESS_KEY: "test-secret-key",
  });
  const upload = await createUploadUrl({
    storageKey: "users/user/transactions/transaction/attachment/file.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 100,
  });
  const download = await createDownloadUrl(
    "users/user/transactions/transaction/attachment/file.jpg",
    "file.jpg",
  );
  assert.match(upload.uploadUrl, /^https:\/\/objects\.example\.test\//);
  assert.match(upload.uploadUrl, /X-Amz-Signature=/);
  assert.match(download, /X-Amz-Signature=/);
});
