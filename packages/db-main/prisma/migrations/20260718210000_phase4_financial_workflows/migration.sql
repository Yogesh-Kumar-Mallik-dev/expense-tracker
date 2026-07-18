ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

CREATE TYPE "ScheduleFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "ScheduleOccurrenceStatus" AS ENUM ('DUE', 'POSTED', 'SKIPPED');
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'CLEARED', 'RECONCILED');
CREATE TYPE "RestoreDatasetStatus" AS ENUM ('READY', 'ACTIVATED', 'DISCARDED');

CREATE TABLE "TransactionSchedule" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "accountId" UUID NOT NULL,
  "transferAccountId" UUID, "categoryId" UUID, "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL, "currency" VARCHAR(3) NOT NULL,
  "description" TEXT, "note" TEXT, "frequency" "ScheduleFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1, "startsOn" DATE NOT NULL,
  "nextOccurrenceOn" DATE NOT NULL, "endsOn" DATE, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "TransactionSchedule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ScheduleOccurrence" (
  "id" UUID NOT NULL, "scheduleId" UUID NOT NULL, "occurrenceDate" DATE NOT NULL,
  "status" "ScheduleOccurrenceStatus" NOT NULL DEFAULT 'DUE', "transactionId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ScheduleOccurrence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AccountTransactionState" (
  "id" UUID NOT NULL, "accountId" UUID NOT NULL, "transactionId" UUID NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING', "statementDate" DATE,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AccountTransactionState_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Reconciliation" (
  "id" UUID NOT NULL, "accountId" UUID NOT NULL, "statementDate" DATE NOT NULL,
  "statementBalance" DECIMAL(19,4) NOT NULL, "reconciledBalance" DECIMAL(19,4) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RestoreDataset" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "name" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
  "status" "RestoreDatasetStatus" NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "activatedAt" TIMESTAMPTZ(3),
  CONSTRAINT "RestoreDataset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleOccurrence_scheduleId_occurrenceDate_key" ON "ScheduleOccurrence"("scheduleId","occurrenceDate");
CREATE UNIQUE INDEX "AccountTransactionState_accountId_transactionId_key" ON "AccountTransactionState"("accountId","transactionId");
CREATE UNIQUE INDEX "Reconciliation_accountId_statementDate_key" ON "Reconciliation"("accountId","statementDate");
CREATE INDEX "TransactionSchedule_userId_nextOccurrenceOn_idx" ON "TransactionSchedule"("userId","nextOccurrenceOn");
CREATE INDEX "AccountTransactionState_accountId_status_idx" ON "AccountTransactionState"("accountId","status");
CREATE INDEX "RestoreDataset_userId_createdAt_idx" ON "RestoreDataset"("userId","createdAt");

ALTER TABLE "TransactionSchedule" ADD CONSTRAINT "TransactionSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "TransactionSchedule" ADD CONSTRAINT "TransactionSchedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransactionSchedule"("id") ON DELETE CASCADE;
ALTER TABLE "ScheduleOccurrence" ADD CONSTRAINT "ScheduleOccurrence_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL;
ALTER TABLE "AccountTransactionState" ADD CONSTRAINT "AccountTransactionState_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "AccountTransactionState" ADD CONSTRAINT "AccountTransactionState_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE;
ALTER TABLE "Reconciliation" ADD CONSTRAINT "Reconciliation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE;
ALTER TABLE "RestoreDataset" ADD CONSTRAINT "RestoreDataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "TransactionSchedule" ADD CONSTRAINT "TransactionSchedule_interval_check" CHECK ("interval" > 0);
ALTER TABLE "TransactionSchedule" ADD CONSTRAINT "TransactionSchedule_amount_check" CHECK ("amount" > 0);
