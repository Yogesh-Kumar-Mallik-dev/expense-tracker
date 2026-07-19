import assert from "node:assert/strict";
import test from "node:test";
import { assertAttachmentStorageKey } from "../../apps/api/src/domain-authorization";
import { HttpError } from "../../apps/api/src/http";

test("attachment download keys must remain inside the owning transaction prefix", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const transactionId = "00000000-0000-4000-8000-000000000002";

  assert.doesNotThrow(() =>
    assertAttachmentStorageKey(
      userId,
      transactionId,
      `users/${userId}/transactions/${transactionId}/attachment/receipt.pdf`,
    ),
  );

  assert.throws(
    () =>
      assertAttachmentStorageKey(
        userId,
        transactionId,
        "users/another-user/transactions/another-transaction/receipt.pdf",
      ),
    (error: unknown) =>
      error instanceof HttpError &&
      error.status === 400 &&
      error.code === "INVALID_DOMAIN_RELATIONSHIP",
  );
});
