CREATE TYPE "BudgetMode" AS ENUM ('SPENDING_LIMIT', 'ENVELOPE');
CREATE TYPE "BudgetRolloverPolicy" AS ENUM ('NONE', 'POSITIVE_ONLY', 'FULL');

ALTER TABLE "Budget"
ADD COLUMN "mode" "BudgetMode" NOT NULL DEFAULT 'SPENDING_LIMIT',
ADD COLUMN "rolloverPolicy" "BudgetRolloverPolicy" NOT NULL DEFAULT 'NONE';

CREATE TABLE "EnvelopeAllocation" (
  "id" UUID NOT NULL,
  "budgetId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "occurredAt" DATE NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "EnvelopeAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnvelopeAllocation_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT
);

CREATE TABLE "BudgetTransfer" (
  "id" UUID NOT NULL,
  "budgetId" UUID NOT NULL,
  "fromCategoryId" UUID,
  "toCategoryId" UUID,
  "amount" DECIMAL(19,4) NOT NULL,
  "occurredAt" DATE NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "BudgetTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BudgetTransfer_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT
);

CREATE INDEX "EnvelopeAllocation_budgetId_categoryId_occurredAt_idx"
ON "EnvelopeAllocation"("budgetId", "categoryId", "occurredAt");
CREATE INDEX "BudgetTransfer_budgetId_occurredAt_idx"
ON "BudgetTransfer"("budgetId", "occurredAt");
