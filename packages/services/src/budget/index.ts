import { z } from "zod";
import {
  SingleRowService,
  type Clock,
  type CrudRepositoryPort,
  type IdFactory,
} from "../shared";
import { moneySchema } from "../transaction";
import { formatMoney, parseMoney } from "../shared";

export const budgetModes = ["SPENDING_LIMIT", "ENVELOPE"] as const;
export type BudgetMode = (typeof budgetModes)[number];
export const rolloverPolicies = ["NONE", "POSITIVE_ONLY", "FULL"] as const;
export type RolloverPolicy = (typeof rolloverPolicies)[number];

export interface BudgetRecord {
  id: string;
  userId: string;
  name: string;
  amount: string;
  currency: string;
  startsOn: string;
  endsOn: string;
  mode: BudgetMode;
  rolloverPolicy: RolloverPolicy;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface CreateBudgetInput {
  userId: string;
  name: string;
  amount: string;
  currency: string;
  startsOn: string;
  endsOn: string;
  mode?: BudgetMode;
  rolloverPolicy?: RolloverPolicy;
}
export type UpdateBudgetInput = Partial<
  Pick<
    BudgetRecord,
    | "name"
    | "amount"
    | "currency"
    | "startsOn"
    | "endsOn"
    | "mode"
    | "rolloverPolicy"
  >
>;
export interface BudgetRepositoryPort extends CrudRepositoryPort<
  BudgetRecord,
  UpdateBudgetInput
> {
  listForPeriod(
    userId: string,
    from: string,
    to: string,
  ): Promise<BudgetRecord[]>;
}
const schema = z
  .object({
    userId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    amount: moneySchema,
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    mode: z.enum(budgetModes).default("SPENDING_LIMIT"),
    rolloverPolicy: z.enum(rolloverPolicies).default("NONE"),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: "Budget end must not precede start",
    path: ["endsOn"],
  });
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    amount: moneySchema.optional(),
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase())
      .optional(),
    startsOn: z.iso.date().optional(),
    endsOn: z.iso.date().optional(),
    mode: z.enum(budgetModes).optional(),
    rolloverPolicy: z.enum(rolloverPolicies).optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
export class BudgetService extends SingleRowService<
  BudgetRecord,
  CreateBudgetInput,
  UpdateBudgetInput
> {
  constructor(
    repository: BudgetRepositoryPort,
    idFactory?: IdFactory,
    clock?: Clock,
  ) {
    super(repository, idFactory, clock);
  }
  // Concurrency note: N/A - pure validation and record construction; no stored totals are mutated.
  protected build(
    input: CreateBudgetInput,
    id: string,
    now: string,
  ): BudgetRecord {
    const v = schema.parse(input);
    return { id, ...v, createdAt: now, updatedAt: now, deletedAt: null };
  }
  // Concurrency note: N/A - pure replacement validation; aggregate budget usage is never persisted here.
  protected parseUpdate(input: UpdateBudgetInput) {
    return updateSchema.parse(input) as UpdateBudgetInput;
  }
  // Concurrency note: Safe read-only range query; date strings select records and do not resolve write conflicts.
  listForPeriod(userId: string, from: string, to: string) {
    return (this.repository as BudgetRepositoryPort).listForPeriod(
      z.uuid().parse(userId),
      z.iso.date().parse(from),
      z.iso.date().parse(to),
    );
  }

  async convertMode(id: string, userId: string): Promise<BudgetRecord> {
    const source = await this.get(id, userId);
    if (!source) throw new Error("Budget not found");
    const preview = previewBudgetModeConversion(source);
    const now = this.clock();
    const target: BudgetRecord = {
      ...source,
      id: z.uuid().parse(this.idFactory()),
      name: `${source.name} (${preview.to === "ENVELOPE" ? "Envelope" : "Limit"})`,
      mode: preview.to,
      amount: preview.suggestedAmount,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.repository.create(target);
    await this.repository.delete(source.id, userId);
    return target;
  }
}

export interface EnvelopeAllocationRecord {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: string;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface EnvelopeTransferRecord {
  id: string;
  budgetId: string;
  fromCategoryId: string | null;
  toCategoryId: string | null;
  amount: string;
  occurredAt: string;
  note: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface SpendingLimitProjection {
  mode: "SPENDING_LIMIT";
  limit: string;
  spent: string;
  remaining: string;
  exceeded: boolean;
}

export interface EnvelopeProjection {
  mode: "ENVELOPE";
  assigned: string;
  activity: string;
  incomingTransfers: string;
  outgoingTransfers: string;
  carryOver: string;
  available: string;
}

export function spendingLimitProjection(
  limit: string,
  spent: string,
): SpendingLimitProjection {
  const parsedLimit = parseMoney(moneySchema.parse(limit));
  const parsedSpent = parseMoney(moneySchema.parse(spent));
  return {
    mode: "SPENDING_LIMIT",
    limit: formatMoney(parsedLimit),
    spent: formatMoney(parsedSpent),
    remaining: formatMoney(parsedLimit - parsedSpent),
    exceeded: parsedSpent > parsedLimit,
  };
}

export function envelopeProjection(input: {
  assigned: string;
  activity: string;
  incomingTransfers?: string;
  outgoingTransfers?: string;
  carryOver?: string;
}): EnvelopeProjection {
  const assigned = parseMoney(moneySchema.parse(input.assigned));
  const activity = parseMoney(moneySchema.parse(input.activity));
  const incoming = parseMoney(
    moneySchema.parse(input.incomingTransfers ?? "0"),
  );
  const outgoing = parseMoney(
    moneySchema.parse(input.outgoingTransfers ?? "0"),
  );
  const carryOver = parseMoney(moneySchema.parse(input.carryOver ?? "0"));
  return {
    mode: "ENVELOPE",
    assigned: formatMoney(assigned),
    activity: formatMoney(activity),
    incomingTransfers: formatMoney(incoming),
    outgoingTransfers: formatMoney(outgoing),
    carryOver: formatMoney(carryOver),
    available: formatMoney(
      carryOver + assigned + incoming - activity - outgoing,
    ),
  };
}

export function readyToAssign(income: string, assigned: string): string {
  return formatMoney(
    parseMoney(moneySchema.parse(income)) -
      parseMoney(moneySchema.parse(assigned)),
  );
}

export interface BudgetModeConversionPreview {
  sourceBudgetId: string;
  from: BudgetMode;
  to: BudgetMode;
  suggestedAmount: string;
  warnings: string[];
}

export function previewBudgetModeConversion(
  budget: BudgetRecord,
): BudgetModeConversionPreview {
  const to = budget.mode === "SPENDING_LIMIT" ? "ENVELOPE" : "SPENDING_LIMIT";
  return {
    sourceBudgetId: budget.id,
    from: budget.mode,
    to,
    suggestedAmount: formatMoney(parseMoney(budget.amount)),
    warnings:
      to === "ENVELOPE"
        ? [
            "The suggested assignment must be funded from ready-to-assign income.",
          ]
        : ["Envelope transfers and historical assignments remain read-only."],
  };
}

export * from "./activity";
