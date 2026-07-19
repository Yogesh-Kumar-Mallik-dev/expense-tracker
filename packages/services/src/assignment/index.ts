import { z } from "zod";
import type { Clock, IdFactory } from "../shared";
import { createUuid, parseUuid, systemClock } from "../shared";
export interface AssignmentRecord {
  id: string;
  createdAt: string;
  deletedAt: string | null;
}
export interface AssignmentRepositoryPort<T extends AssignmentRecord> {
  create(v: T): Promise<unknown>;
  list(parentId: string, userId: string): Promise<T[]>;
  delete(parentId: string, childId: string, userId: string): Promise<unknown>;
}
export interface BudgetCategoryRecord extends AssignmentRecord {
  budgetId: string;
  categoryId: string;
}
export interface TransactionTagRecord extends AssignmentRecord {
  transactionId: string;
  tagId: string;
}
export const budgetCategorySchema = z.object({
  budgetId: z.uuid(),
  categoryId: z.uuid(),
});
export const transactionTagSchema = z.object({
  transactionId: z.uuid(),
  tagId: z.uuid(),
});
abstract class AssignmentService<T extends AssignmentRecord> {
  constructor(
    protected readonly repository: AssignmentRepositoryPort<T>,
    protected readonly idFactory: IdFactory = createUuid,
    protected readonly clock: Clock = systemClock,
  ) {}
  // Concurrency note: Safe read-only relationship query; partial sync may temporarily return fewer assignments without corrupting either parent.
  list(parentId: string, userId: string) {
    return this.repository.list(
      z.uuid().parse(parentId),
      z.uuid().parse(userId),
    );
  }
  // Concurrency note: Safe idempotent single-row tombstone; the parent record is not modified.
  async delete(parentId: string, childId: string, userId: string) {
    await this.repository.delete(
      z.uuid().parse(parentId),
      z.uuid().parse(childId),
      z.uuid().parse(userId),
    );
  }
}
export class BudgetCategoryService extends AssignmentService<BudgetCategoryRecord> {
  // Concurrency note: Safe independent join-row insert with a UUID; budget/category creation may sync separately without invalidating either parent.
  async create(budgetId: string, categoryId: string) {
    const record: BudgetCategoryRecord = {
      id: parseUuid(this.idFactory()),
      ...budgetCategorySchema.parse({ budgetId, categoryId }),
      createdAt: this.clock(),
      deletedAt: null,
    };
    await this.repository.create(record);
    return record;
  }
}
export class TransactionTagService extends AssignmentService<TransactionTagRecord> {
  // Concurrency note: Safe independent join-row insert with a UUID; transaction/tag creation is not claimed to be sync-atomic.
  async create(transactionId: string, tagId: string) {
    const record: TransactionTagRecord = {
      id: parseUuid(this.idFactory()),
      ...transactionTagSchema.parse({ transactionId, tagId }),
      createdAt: this.clock(),
      deletedAt: null,
    };
    await this.repository.create(record);
    return record;
  }
}
