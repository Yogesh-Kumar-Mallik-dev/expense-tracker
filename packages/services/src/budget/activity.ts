import { z } from "zod";
import { createUuid, type Clock, type IdFactory, systemClock } from "../shared";
import { moneySchema } from "../transaction";
import type {
  BudgetRepositoryPort,
  EnvelopeAllocationRecord,
  EnvelopeTransferRecord,
} from "./index";

export interface BudgetActivityRepositoryPort {
  createAllocation(value: EnvelopeAllocationRecord): Promise<unknown>;
  createTransfer(value: EnvelopeTransferRecord): Promise<unknown>;
  listAllocations(budgetId: string): Promise<EnvelopeAllocationRecord[]>;
  listTransfers(budgetId: string): Promise<EnvelopeTransferRecord[]>;
}

const allocationSchema = z.object({
  budgetId: z.uuid(),
  categoryId: z.uuid(),
  amount: moneySchema.refine(
    (value) => !value.startsWith("-") && value !== "0",
  ),
  occurredAt: z.iso.date(),
  note: z.string().trim().max(500).nullable().default(null),
});
const transferSchema = z
  .object({
    budgetId: z.uuid(),
    fromCategoryId: z.uuid().nullable(),
    toCategoryId: z.uuid().nullable(),
    amount: moneySchema.refine(
      (value) => !value.startsWith("-") && value !== "0",
    ),
    occurredAt: z.iso.date(),
    note: z.string().trim().max(500).nullable().default(null),
  })
  .refine((value) => value.fromCategoryId || value.toCategoryId, {
    message: "A transfer requires a source or destination category",
  })
  .refine((value) => value.fromCategoryId !== value.toCategoryId, {
    message: "Transfer categories must differ",
  });

export class BudgetActivityService {
  constructor(
    private readonly repository: BudgetActivityRepositoryPort,
    private readonly budgets: BudgetRepositoryPort,
    private readonly idFactory: IdFactory = createUuid,
    private readonly clock: Clock = systemClock,
  ) {}

  private async requireEnvelope(budgetId: string, userId: string) {
    const budget = await this.budgets.findById(
      z.uuid().parse(budgetId),
      z.uuid().parse(userId),
    );
    if (!budget) throw new Error("Budget not found");
    if (budget.mode !== "ENVELOPE")
      throw new Error("Allocations and transfers require envelope mode");
    return budget;
  }

  async allocate(
    userId: string,
    input: Omit<EnvelopeAllocationRecord, "id" | "createdAt" | "deletedAt">,
  ) {
    await this.requireEnvelope(input.budgetId, userId);
    const value = allocationSchema.parse(input);
    const record: EnvelopeAllocationRecord = {
      id: this.idFactory(),
      ...value,
      createdAt: this.clock(),
      deletedAt: null,
    };
    await this.repository.createAllocation(record);
    return record;
  }

  async transfer(
    userId: string,
    input: Omit<EnvelopeTransferRecord, "id" | "createdAt" | "deletedAt">,
  ) {
    await this.requireEnvelope(input.budgetId, userId);
    const value = transferSchema.parse(input);
    const record: EnvelopeTransferRecord = {
      id: this.idFactory(),
      ...value,
      createdAt: this.clock(),
      deletedAt: null,
    };
    await this.repository.createTransfer(record);
    return record;
  }

  async listAllocations(userId: string, budgetId: string) {
    await this.requireEnvelope(budgetId, userId);
    return this.repository.listAllocations(budgetId);
  }

  async listTransfers(userId: string, budgetId: string) {
    await this.requireEnvelope(budgetId, userId);
    return this.repository.listTransfers(budgetId);
  }
}
