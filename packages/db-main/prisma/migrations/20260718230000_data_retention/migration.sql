CREATE TABLE "DataDeletionRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
  "cancelledAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DataDeletionRequest_scheduledFor_completedAt_idx" ON "DataDeletionRequest"("scheduledFor","completedAt");
CREATE INDEX "DataDeletionRequest_userId_requestedAt_idx" ON "DataDeletionRequest"("userId","requestedAt");
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
