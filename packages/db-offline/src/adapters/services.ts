import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import type {
  AccountRecord,
  AccountRepositoryPort,
  AttachmentRecord,
  AttachmentRepositoryPort,
  BudgetCategoryRecord,
  BudgetActivityRepositoryPort,
  BudgetRecord,
  BudgetRepositoryPort,
  EnvelopeAllocationRecord,
  EnvelopeTransferRecord,
  CategoryRecord,
  CategoryRepositoryPort,
  DeviceRecord,
  DeviceRepositoryPort,
  ReportingRepositoryPort,
  TagRecord,
  TagRepositoryPort,
  TransactionRecord,
  TransactionRepositoryPort,
  TransactionTagRecord,
  UserRecord,
  UserRepositoryPort,
  AssignmentRepositoryPort,
} from "@expense-tracker/services";
import type { OfflineDatabase } from "../database";
import {
  AccountRepository,
  AttachmentRepository,
  BudgetCategoryRepository,
  BudgetRepository,
  CategoryRepository,
  DeviceRepository,
  TagRepository,
  TransactionRepository,
  TransactionTagRepository,
  UserRepository,
} from "../repositories";
import {
  accounts,
  budgetCategories,
  budgetTransfers,
  budgets,
  envelopeAllocations,
  transactions,
} from "../schema";

export class OfflineAccountAdapter implements AccountRepositoryPort {
  constructor(private readonly value: AccountRepository) {}
  async create(v: AccountRecord) {
    await this.value.create(v);
  }
  async findById(id: string, userId: string) {
    return await this.value.findById(id, userId);
  }
  async listByUser(userId: string, includeArchived = false) {
    return await this.value.listByUser(userId, includeArchived);
  }
  async update(
    id: string,
    userId: string,
    v: Parameters<AccountRepository["update"]>[2],
  ) {
    await this.value.update(id, userId, v);
  }
  async delete(id: string, userId: string) {
    await this.value.delete(id, userId);
  }
}
export class OfflineCategoryAdapter implements CategoryRepositoryPort {
  constructor(private readonly value: CategoryRepository) {}
  async create(v: CategoryRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listByUser(u: string, t?: CategoryRecord["type"], a = false) {
    return await this.value.listByUser(u, t, a);
  }
  async update(
    id: string,
    u: string,
    v: Parameters<CategoryRepository["update"]>[2],
  ) {
    await this.value.update(id, u, v);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
}
export class OfflineTagAdapter implements TagRepositoryPort {
  constructor(private readonly value: TagRepository) {}
  async create(v: TagRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listByUser(u: string) {
    return await this.value.listByUser(u);
  }
  async update(
    id: string,
    u: string,
    v: Parameters<TagRepository["update"]>[2],
  ) {
    await this.value.update(id, u, v);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
}
export class OfflineBudgetAdapter implements BudgetRepositoryPort {
  constructor(private readonly value: BudgetRepository) {}
  async create(v: BudgetRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listForPeriod(u: string, f: string, t: string) {
    return await this.value.listForPeriod(u, f, t);
  }
  async update(
    id: string,
    u: string,
    v: Parameters<BudgetRepository["update"]>[2],
  ) {
    await this.value.update(id, u, v);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
}

export class OfflineBudgetActivityAdapter implements BudgetActivityRepositoryPort {
  constructor(private readonly db: OfflineDatabase) {}
  async createAllocation(v: EnvelopeAllocationRecord) {
    await this.db.insert(envelopeAllocations).values(v);
  }
  async createTransfer(v: EnvelopeTransferRecord) {
    await this.db.insert(budgetTransfers).values(v);
  }
  async listAllocations(budgetId: string) {
    return await this.db
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          eq(envelopeAllocations.budgetId, budgetId),
          isNull(envelopeAllocations.deletedAt),
        ),
      );
  }
  async listTransfers(budgetId: string) {
    return await this.db
      .select()
      .from(budgetTransfers)
      .where(
        and(
          eq(budgetTransfers.budgetId, budgetId),
          isNull(budgetTransfers.deletedAt),
        ),
      );
  }
}
export class OfflineTransactionAdapter implements TransactionRepositoryPort {
  constructor(private readonly value: TransactionRepository) {}
  async create(v: TransactionRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listByUser(u: string, f = {}) {
    return await this.value.listByUser(u, f);
  }
  async update(
    id: string,
    u: string,
    v: Parameters<TransactionRepository["update"]>[2],
  ) {
    await this.value.update(id, u, v);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
  async restore(id: string, u: string, updatedAt: string) {
    await this.value.restore(id, u, updatedAt);
  }
}
export class OfflineAttachmentAdapter implements AttachmentRepositoryPort {
  constructor(private readonly value: AttachmentRepository) {}
  async create(v: AttachmentRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listByTransaction(id: string, u: string) {
    return await this.value.listByTransaction(id, u);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
}
export class OfflineDeviceAdapter implements DeviceRepositoryPort {
  constructor(private readonly value: DeviceRepository) {}
  async create(v: DeviceRecord) {
    await this.value.create(v);
  }
  async findById(id: string, u: string) {
    return await this.value.findById(id, u);
  }
  async listByUser(u: string) {
    return await this.value.listByUser(u);
  }
  async update(
    id: string,
    u: string,
    v: Parameters<DeviceRepository["update"]>[2],
  ) {
    await this.value.update(id, u, v);
  }
  async delete(id: string, u: string) {
    await this.value.delete(id, u);
  }
}
export class OfflineUserAdapter implements UserRepositoryPort {
  constructor(private readonly value: UserRepository) {}
  async create(v: UserRecord) {
    await this.value.create(v);
  }
  async findById(id: string) {
    return await this.value.findById(id);
  }
  async findByEmail(e: string) {
    return await this.value.findByEmail(e);
  }
  async update(
    id: string,
    _u: string,
    v: Parameters<UserRepository["update"]>[1],
  ) {
    await this.value.update(id, v);
  }
  async delete(id: string) {
    await this.value.delete(id);
  }
}
export class OfflineBudgetCategoryAdapter implements AssignmentRepositoryPort<BudgetCategoryRecord> {
  constructor(private readonly value: BudgetCategoryRepository) {}
  async create(v: BudgetCategoryRecord) {
    await this.value.create(v);
  }
  async list(p: string, u: string) {
    return (await this.value.listByBudget(p, u)).map((v) => v.assignment);
  }
  async delete(p: string, c: string, u: string) {
    await this.value.delete(p, c, u);
  }
}
export class OfflineTransactionTagAdapter implements AssignmentRepositoryPort<TransactionTagRecord> {
  constructor(private readonly value: TransactionTagRepository) {}
  async create(v: TransactionTagRecord) {
    await this.value.create(v);
  }
  async list(p: string, u: string) {
    return (await this.value.listByTransaction(p, u)).map((v) => v.assignment);
  }
  async delete(p: string, c: string, u: string) {
    await this.value.delete(p, c, u);
  }
}

export class OfflineReportingAdapter implements ReportingRepositoryPort {
  constructor(private readonly db: OfflineDatabase) {}
  async listAccounts(userId: string) {
    return await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)));
  }
  async listTransactions(userId: string, from?: string, to?: string) {
    return await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          from ? gte(transactions.occurredAt, from) : undefined,
          to ? lte(transactions.occurredAt, to) : undefined,
        ),
      );
  }
  async listBudgets(userId: string, from: string, to: string) {
    return await this.db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          isNull(budgets.deletedAt),
          lte(budgets.startsOn, to),
          gte(budgets.endsOn, from),
        ),
      );
  }
  async listBudgetCategories(ids: string[]) {
    if (ids.length === 0) return [];
    return await this.db
      .select()
      .from(budgetCategories)
      .where(
        and(
          inArray(budgetCategories.budgetId, ids),
          isNull(budgetCategories.deletedAt),
        ),
      );
  }
  async listEnvelopeAllocations(ids: string[], from: string, to: string) {
    if (!ids.length) return [];
    return await this.db
      .select()
      .from(envelopeAllocations)
      .where(
        and(
          inArray(envelopeAllocations.budgetId, ids),
          isNull(envelopeAllocations.deletedAt),
          gte(envelopeAllocations.occurredAt, from),
          lte(envelopeAllocations.occurredAt, to),
        ),
      );
  }
  async listBudgetTransfers(ids: string[], from: string, to: string) {
    if (!ids.length) return [];
    return await this.db
      .select()
      .from(budgetTransfers)
      .where(
        and(
          inArray(budgetTransfers.budgetId, ids),
          isNull(budgetTransfers.deletedAt),
          gte(budgetTransfers.occurredAt, from),
          lte(budgetTransfers.occurredAt, to),
        ),
      );
  }
}
