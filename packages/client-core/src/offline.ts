import type { OfflineServices } from "@expense-tracker/db-offline";
import type {
  AccountInput,
  BudgetInput,
  CategoryInput,
  TagInput,
  TransactionFilters,
  TransactionInput,
} from "./contracts";
import type { ExpenseDataClient } from "./application";

export class OfflineExpenseClient implements ExpenseDataClient {
  constructor(
    private readonly services: () => OfflineServices,
    private readonly userId: () => string,
    private readonly remote: ExpenseDataClient,
    private readonly attachmentQueue?: {
      upload(
        transactionId: string,
        file: Blob & { name: string; type: string },
      ): ReturnType<ExpenseDataClient["uploadAttachment"]>;
    },
  ) {}

  private get local() {
    return this.services();
  }
  private get user() {
    return this.userId();
  }
  async accounts(_signal?: AbortSignal, includeArchived = false) {
    return { data: await this.local.accounts.list(this.user, includeArchived) };
  }
  async createAccount(value: AccountInput) {
    return {
      data: await this.local.accounts.create({ ...value, userId: this.user }),
    };
  }
  async updateAccount(
    id: string,
    value: Partial<AccountInput> & { isArchived?: boolean },
  ) {
    await this.local.accounts.update(id, this.user, value);
  }
  async deleteAccount(id: string) {
    await this.local.accounts.delete(id, this.user);
  }
  async balances() {
    return { data: await this.local.reporting.accountBalances(this.user) };
  }
  async categories(_signal?: AbortSignal, includeArchived = false) {
    return {
      data: await this.local.categories.list(
        this.user,
        undefined,
        includeArchived,
      ),
    };
  }
  async createCategory(value: CategoryInput) {
    return {
      data: await this.local.categories.create({ ...value, userId: this.user }),
    };
  }
  async updateCategory(
    id: string,
    value: Partial<CategoryInput> & { isArchived?: boolean },
  ) {
    await this.local.categories.update(id, this.user, value);
  }
  async deleteCategory(id: string) {
    await this.local.categories.delete(id, this.user);
  }
  async tags() {
    return { data: await this.local.tags.list(this.user) };
  }
  async createTag(value: TagInput) {
    return {
      data: await this.local.tags.create({ ...value, userId: this.user }),
    };
  }
  async updateTag(id: string, value: TagInput) {
    await this.local.tags.update(id, this.user, value);
  }
  async deleteTag(id: string) {
    await this.local.tags.delete(id, this.user);
  }
  async transactions(filters: TransactionFilters) {
    const result = await this.local.transactions.page(this.user, {
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.from
        ? { from: new Date(`${filters.from}T00:00:00`).toISOString() }
        : {}),
      ...(filters.to
        ? { to: new Date(`${filters.to}T23:59:59.999`).toISOString() }
        : {}),
      ...(filters.search ? { search: filters.search } : {}),
      offset: (filters.page - 1) * filters.pageSize,
      limit: filters.pageSize,
    });
    const totalPages = result.total
      ? Math.ceil(result.total / filters.pageSize)
      : 0;
    return {
      data: result.items,
      meta: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrevious: filters.page > 1 && result.total > 0,
      },
    };
  }
  async createTransaction(value: TransactionInput) {
    return {
      data: await this.local.transactions.create({
        ...value,
        userId: this.user,
      }),
    };
  }
  async updateTransaction(id: string, value: TransactionInput) {
    await this.local.transactions.update(id, this.user, value);
  }
  async deleteTransaction(id: string) {
    await this.local.transactions.delete(id, this.user);
  }
  async restoreTransaction(id: string) {
    return { data: await this.local.transactions.restore(id, this.user) };
  }
  async transactionTags(id: string) {
    return { data: await this.local.transactionTags.list(id, this.user) };
  }
  async addTransactionTag(id: string, tagId: string) {
    await this.local.transactionTags.create(id, tagId);
  }
  async removeTransactionTag(id: string, tagId: string) {
    await this.local.transactionTags.delete(id, tagId, this.user);
  }
  async attachments(id: string) {
    return {
      data: await this.local.attachments.listByTransaction(id, this.user),
    };
  }
  uploadAttachment(id: string, file: Blob & { name: string; type: string }) {
    return this.attachmentQueue
      ? this.attachmentQueue.upload(id, file)
      : this.remote.uploadAttachment(id, file);
  }
  async deleteAttachment(id: string) {
    await this.local.attachments.delete(id, this.user);
  }
  attachmentDownload(id: string) {
    return this.remote.attachmentDownload(id);
  }
  async budgets(from: string, to: string) {
    return {
      data: await this.local.budgets.listForPeriod(this.user, from, to),
    };
  }
  async budgetUsage(from: string, to: string) {
    return {
      data: await this.local.reporting.budgetUsage(this.user, from, to),
    };
  }
  async periodSpending(from: string, to: string) {
    return {
      data: await this.local.reporting.periodSpending(this.user, from, to),
    };
  }
  async categorySpending(from: string, to: string) {
    return {
      data: await this.local.reporting.categorySpending(this.user, from, to),
    };
  }
  async netWorthHistory(from: string, to: string) {
    return {
      data: await this.local.reporting.netWorthHistory(this.user, from, to),
    };
  }
  async createBudget(value: BudgetInput) {
    return {
      data: await this.local.budgets.create({ ...value, userId: this.user }),
    };
  }
  async updateBudget(id: string, value: Partial<BudgetInput>) {
    await this.local.budgets.update(id, this.user, value);
  }
  async deleteBudget(id: string) {
    await this.local.budgets.delete(id, this.user);
  }
  convertBudget(
    id: string,
    value: Parameters<ExpenseDataClient["convertBudget"]>[1],
  ) {
    return this.remote.convertBudget(id, value);
  }
  async assignBudgetCategory(id: string, categoryId: string) {
    await this.local.budgetCategories.create(id, categoryId);
  }
  async removeBudgetCategory(id: string, categoryId: string) {
    await this.local.budgetCategories.delete(id, categoryId, this.user);
  }
  async budgetCategories(id: string) {
    return { data: await this.local.budgetCategories.list(id, this.user) };
  }
  async envelopeAllocations(id: string) {
    return {
      data: await this.local.budgetActivity.listAllocations(this.user, id),
    };
  }
  async allocateEnvelope(
    id: string,
    value: {
      categoryId: string;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ) {
    await this.local.budgetActivity.allocate(this.user, {
      ...value,
      budgetId: id,
    });
  }
  async envelopeTransfers(id: string) {
    return {
      data: await this.local.budgetActivity.listTransfers(this.user, id),
    };
  }
  async transferEnvelope(
    id: string,
    value: {
      fromCategoryId: string | null;
      toCategoryId: string | null;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ) {
    await this.local.budgetActivity.transfer(this.user, {
      ...value,
      budgetId: id,
    });
  }
  async devices() {
    return { data: await this.local.devices.list(this.user) };
  }
  async updateDevice(id: string, name: string) {
    await this.local.devices.update(id, this.user, { name });
  }
  deleteDevice(id: string) {
    return this.remote.deleteDevice(id);
  }
  updateProfile(value: {
    name?: string | null;
    currency?: string;
    timezone?: string;
  }) {
    return this.remote.updateProfile(value);
  }
  deleteProfile() {
    return this.remote.deleteProfile();
  }
  deletionRequest() {
    return this.remote.deletionRequest();
  }
  cancelDeletion() {
    return this.remote.cancelDeletion();
  }
  requestEmailChange(email: string) {
    return this.remote.requestEmailChange(email);
  }
  exportBackup() {
    return this.remote.exportBackup();
  }
  stageRestore(name: string, backup: unknown) {
    return this.remote.stageRestore(name, backup);
  }
  restoreDatasets() {
    return this.remote.restoreDatasets();
  }
  restoreDataset(id: string) {
    return this.remote.restoreDataset(id);
  }
  reconcileAccount(
    accountId: string,
    value: {
      statementDate: string;
      statementBalance: string;
      clearedTransactionIds: string[];
    },
  ) {
    return this.remote.reconcileAccount(accountId, value);
  }
  schedules(through?: string) {
    return this.remote.schedules(through);
  }
  createSchedule(value: Parameters<ExpenseDataClient["createSchedule"]>[0]) {
    return this.remote.createSchedule(value);
  }
  resolveScheduleOccurrence(id: string, action: "POSTED" | "SKIPPED") {
    return this.remote.resolveScheduleOccurrence(id, action);
  }
}
