import type { Clock, IdFactory } from "../shared";
import { createUuid, parseUuid, systemClock } from "../shared";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "./transaction.schema";
import type {
  CreateTransactionInput,
  TransactionRecord,
  TransactionRepositoryPort,
  UpdateTransactionInput,
} from "./transaction.types";

export class TransactionService {
  constructor(
    private readonly repository: TransactionRepositoryPort,
    private readonly idFactory: IdFactory = createUuid,
    private readonly clock: Clock = systemClock,
  ) {}

  // Concurrency note: Safe single-row insert with a preassigned UUID; related account/category IDs are accepted from local state without remote validation.
  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const value = createTransactionSchema.parse(input);
    const now = this.clock();
    const record: TransactionRecord = {
      id: parseUuid(this.idFactory()),
      ...value,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.repository.create(record);
    return record;
  }

  // Concurrency note: Safe read-only lookup; no returned value is persisted implicitly.
  get(id: string, userId: string) {
    return this.repository.findById(zUuid(id), zUuid(userId));
  }

  // Concurrency note: Safe read-only query; timestamp ordering is presentation-only and must not resolve conflicts across device clocks.
  list(userId: string, filters = {}) {
    return this.repository.listByUser(zUuid(userId), filters);
  }

  async page(
    userId: string,
    filters: {
      accountId?: string;
      categoryId?: string;
      from?: string;
      to?: string;
      offset: number;
      limit: number;
    },
  ) {
    const parsedUserId = zUuid(userId);
    if (this.repository.listPageByUser) {
      return this.repository.listPageByUser(parsedUserId, filters);
    }
    const values = await this.repository.listByUser(parsedUserId, {
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    });
    return {
      items: values.slice(filters.offset, filters.offset + filters.limit),
      total: values.length,
    };
  }

  // Concurrency note: Safe single-row replacement of explicit fields; no value is computed from stale transaction state.
  async update(id: string, userId: string, input: UpdateTransactionInput) {
    const value = updateTransactionSchema.parse(
      input,
    ) as UpdateTransactionInput;
    await this.repository.update(zUuid(id), zUuid(userId), {
      ...value,
      updatedAt: this.clock(),
    });
  }

  // Concurrency note: Safe idempotent single-row tombstone; tags and attachments are not mutated as part of this operation across the sync boundary.
  async delete(id: string, userId: string) {
    await this.repository.delete(zUuid(id), zUuid(userId));
  }
}

// Concurrency note: N/A - pure validation with no database access.
function zUuid(value: string) {
  return createTransactionSchema.shape.userId.parse(value);
}
