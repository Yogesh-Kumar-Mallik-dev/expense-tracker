import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@expense-tracker/db-main";
import { validateTransactionRelationships } from "./domain-authorization";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z
  .string()
  .regex(/^\d+(?:\.\d{1,4})?$/)
  .refine(
    (value) => BigInt(value.replace(".", "")) > 0n,
    "Amount must be positive",
  );
const backupSchema = z.object({
  format: z.literal("expense-tracker-backup"),
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  exportedAt: z.string(),
  user: z.object({ id: z.string().uuid() }).passthrough(),
  records: z.record(z.string(), z.array(z.unknown())),
  omissions: z.array(z.string()),
});
export const scheduleInput = z.object({
  accountId: z.string().uuid(),
  transferAccountId: z.string().uuid().nullable().default(null),
  categoryId: z.string().uuid().nullable().default(null),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: money,
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
  description: z.string().max(500).nullable().default(null),
  note: z.string().max(4000).nullable().default(null),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1).max(120).default(1),
  startsOn: date,
  endsOn: date.nullable().default(null),
});

export function nextScheduleDate(
  current: string,
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY",
  interval: number,
  anchor = current,
) {
  const [year, month, day] = current.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [anchorYear, anchorMonth, anchorDay] = anchor
    .split("-")
    .map(Number) as [number, number, number];
  if (frequency === "WEEKLY") {
    const value = new Date(Date.UTC(year, month - 1, day + interval * 7));
    return value.toISOString().slice(0, 10);
  }
  const months = frequency === "MONTHLY" ? interval : interval * 12;
  const targetMonth =
    frequency === "YEARLY"
      ? anchorMonth - 1 + (year - anchorYear + interval) * 12
      : month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(anchorDay, lastDay)).padStart(2, "0")}`;
}

function localNoon(dateValue: string, timezone: string) {
  const [year, month, day] = dateValue.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  let guess = Date.UTC(year, month - 1, day, 12);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    guess -= represented - Date.UTC(year, month - 1, day, 12);
  }
  return new Date(guess);
}

export async function createSchedule(userId: string, raw: unknown) {
  const value = scheduleInput.parse(raw);
  await validateTransactionRelationships(userId, value);
  return prisma.transactionSchedule.create({
    data: {
      id: randomUUID(),
      userId,
      ...value,
      amount: value.amount,
      startsOn: new Date(`${value.startsOn}T00:00:00Z`),
      nextOccurrenceOn: new Date(`${value.startsOn}T00:00:00Z`),
      endsOn: value.endsOn ? new Date(`${value.endsOn}T00:00:00Z`) : null,
    },
  });
}

export async function materializeDueOccurrences(
  userId: string,
  through: string,
) {
  date.parse(through);
  const schedules = await prisma.transactionSchedule.findMany({
    where: {
      userId,
      deletedAt: null,
      isActive: true,
      nextOccurrenceOn: { lte: new Date(`${through}T00:00:00Z`) },
    },
  });
  return prisma.$transaction(async (tx) => {
    let created = 0;
    for (const schedule of schedules) {
      let occurrence = schedule.nextOccurrenceOn.toISOString().slice(0, 10);
      const end = schedule.endsOn?.toISOString().slice(0, 10);
      while (occurrence <= through && (!end || occurrence <= end)) {
        await tx.scheduleOccurrence.upsert({
          where: {
            scheduleId_occurrenceDate: {
              scheduleId: schedule.id,
              occurrenceDate: new Date(`${occurrence}T00:00:00Z`),
            },
          },
          create: {
            id: randomUUID(),
            scheduleId: schedule.id,
            occurrenceDate: new Date(`${occurrence}T00:00:00Z`),
          },
          update: {},
        });
        created += 1;
        occurrence = nextScheduleDate(
          occurrence,
          schedule.frequency,
          schedule.interval,
          schedule.startsOn.toISOString().slice(0, 10),
        );
      }
      await tx.transactionSchedule.update({
        where: { id: schedule.id },
        data: {
          nextOccurrenceOn: new Date(`${occurrence}T00:00:00Z`),
          isActive: !end || occurrence <= end,
        },
      });
    }
    return { created };
  });
}

export async function resolveOccurrence(
  userId: string,
  occurrenceId: string,
  action: "POSTED" | "SKIPPED",
) {
  return prisma.$transaction(async (tx) => {
    const occurrence = await tx.scheduleOccurrence.findFirstOrThrow({
      where: { id: occurrenceId, status: "DUE", schedule: { userId } },
      include: { schedule: true },
    });
    if (action === "SKIPPED")
      return tx.scheduleOccurrence.update({
        where: { id: occurrence.id },
        data: { status: "SKIPPED", resolvedAt: new Date() },
      });
    const timezone = (
      await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { timezone: true },
      })
    ).timezone;
    const transactionId = randomUUID();
    await tx.transaction.create({
      data: {
        id: transactionId,
        userId,
        accountId: occurrence.schedule.accountId,
        transferAccountId: occurrence.schedule.transferAccountId,
        categoryId: occurrence.schedule.categoryId,
        type: occurrence.schedule.type,
        amount: occurrence.schedule.amount,
        currency: occurrence.schedule.currency,
        description: occurrence.schedule.description,
        note: occurrence.schedule.note,
        occurredAt: localNoon(
          occurrence.occurrenceDate.toISOString().slice(0, 10),
          timezone,
        ),
      },
    });
    return tx.scheduleOccurrence.update({
      where: { id: occurrence.id },
      data: {
        status: "POSTED",
        transactionId,
        resolvedAt: new Date(),
      },
    });
  });
}

export async function stageRestore(userId: string, name: string, raw: unknown) {
  const snapshot = backupSchema.parse(raw);
  if (snapshot.user.id !== userId)
    throw new Error("A backup can only be restored by its original owner");
  const required = [
    "accounts",
    "categories",
    "transactions",
    "budgets",
    "budgetCategories",
    "envelopeAllocations",
    "budgetTransfers",
    "tags",
    "transactionTags",
    "attachments",
  ];
  for (const collection of required)
    if (!Array.isArray(snapshot.records[collection]))
      throw new Error(`Backup is missing the ${collection} collection`);
  for (const collection of [
    "accounts",
    "categories",
    "transactions",
    "budgets",
    "tags",
    "attachments",
    "schedules",
  ]) {
    for (const record of snapshot.records[collection] ?? []) {
      if (
        !record ||
        typeof record !== "object" ||
        !("id" in record) ||
        !("userId" in record) ||
        record.userId !== userId ||
        !z.string().uuid().safeParse(record.id).success
      )
        throw new Error(`Backup contains an invalid ${collection} record`);
    }
  }
  const canonical = JSON.stringify(snapshot);
  return prisma.restoreDataset.create({
    data: {
      id: randomUUID(),
      userId,
      name: z.string().trim().min(1).max(120).parse(name),
      schemaVersion: snapshot.schemaVersion,
      snapshot: JSON.parse(canonical),
    },
    select: { id: true, name: true, status: true, createdAt: true },
  });
}

export async function reconcileAccount(
  userId: string,
  accountId: string,
  raw: unknown,
) {
  const value = z
    .object({
      statementDate: date,
      statementBalance: z.string().regex(/^-?\d+(?:\.\d{1,4})?$/),
      clearedTransactionIds: z.array(z.string().uuid()),
    })
    .parse(raw);
  const account = await prisma.account.findFirstOrThrow({
    where: { id: accountId, userId, deletedAt: null },
  });
  const selectedTransactions = await prisma.transaction.findMany({
    where: {
      id: { in: value.clearedTransactionIds },
      userId,
      deletedAt: null,
      OR: [{ accountId }, { transferAccountId: accountId }],
      occurredAt: { lte: new Date(`${value.statementDate}T23:59:59.999Z`) },
    },
  });
  if (selectedTransactions.length !== new Set(value.clearedTransactionIds).size)
    throw new Error(
      "One or more transactions cannot be reconciled for this account",
    );
  const previouslyReconciled = await prisma.accountTransactionState.findMany({
    where: {
      accountId,
      status: "RECONCILED",
      transaction: {
        deletedAt: null,
        occurredAt: {
          lte: new Date(`${value.statementDate}T23:59:59.999Z`),
        },
      },
    },
    include: { transaction: true },
  });
  const transactions = [
    ...new Map(
      [
        ...previouslyReconciled.map((state) => state.transaction),
        ...selectedTransactions,
      ].map((transaction) => [transaction.id, transaction]),
    ).values(),
  ];
  const fixed = (input: string) => {
    const negative = input.startsWith("-");
    const [whole, fraction = ""] = input.replace(/^-/, "").split(".");
    const value = BigInt(whole!) * 10_000n + BigInt(fraction.padEnd(4, "0"));
    return negative ? -value : value;
  };
  let balance = fixed(account.openingBalance.toFixed(4));
  for (const transaction of transactions) {
    const amount = fixed(transaction.amount.toFixed(4));
    if (
      (transaction.type === "INCOME" && transaction.accountId === accountId) ||
      (transaction.type === "TRANSFER" &&
        transaction.transferAccountId === accountId)
    )
      balance += amount;
    else balance -= amount;
  }
  const expected = fixed(value.statementBalance);
  if (balance !== expected)
    throw new Error(
      `Cleared balance does not match statement balance; difference is ${(
        expected - balance
      ).toString()} minor-ten-thousandths`,
    );
  return prisma.$transaction(async (tx) => {
    for (const transaction of selectedTransactions)
      await tx.accountTransactionState.upsert({
        where: {
          accountId_transactionId: { accountId, transactionId: transaction.id },
        },
        create: {
          id: randomUUID(),
          accountId,
          transactionId: transaction.id,
          status: "RECONCILED",
          statementDate: new Date(`${value.statementDate}T00:00:00Z`),
        },
        update: {
          status: "RECONCILED",
          statementDate: new Date(`${value.statementDate}T00:00:00Z`),
        },
      });
    return tx.reconciliation.create({
      data: {
        id: randomUUID(),
        accountId,
        statementDate: new Date(`${value.statementDate}T00:00:00Z`),
        statementBalance: value.statementBalance,
        reconciledBalance: value.statementBalance,
      },
    });
  });
}
