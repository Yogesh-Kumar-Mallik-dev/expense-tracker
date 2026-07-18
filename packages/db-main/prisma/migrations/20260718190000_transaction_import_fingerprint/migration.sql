ALTER TABLE "Transaction" ADD COLUMN "importFingerprint" TEXT;

CREATE INDEX "Transaction_userId_importFingerprint_idx"
ON "Transaction"("userId", "importFingerprint");

CREATE UNIQUE INDEX "Transaction_userId_importFingerprint_active_key"
ON "Transaction"("userId", "importFingerprint")
WHERE "deletedAt" IS NULL AND "importFingerprint" IS NOT NULL;
