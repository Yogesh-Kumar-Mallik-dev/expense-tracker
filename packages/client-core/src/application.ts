import type {
  Account,
  AccountBalance,
  Budget,
  BudgetUsage,
  Category,
  PageMeta,
  RegistrationInput,
  Session,
  Transaction,
  TransactionFilters,
  TransactionInput,
  AccountInput,
  CategoryInput,
  Tag,
  TagInput,
  BudgetInput,
  Device,
  TransactionTag,
  Attachment,
  BudgetCategory,
  EnvelopeAllocation,
  EnvelopeTransfer,
} from "./contracts";

export type Result<T> = { data: T; meta?: PageMeta };

export interface ExpenseDataClient {
  accounts(
    signal?: AbortSignal,
    includeArchived?: boolean,
  ): Promise<Result<Account[]>>;
  createAccount(value: AccountInput): Promise<Result<Account>>;
  updateAccount(
    id: string,
    value: Partial<AccountInput> & { isArchived?: boolean },
  ): Promise<void>;
  deleteAccount(id: string): Promise<void>;
  balances(signal?: AbortSignal): Promise<Result<AccountBalance[]>>;
  categories(
    signal?: AbortSignal,
    includeArchived?: boolean,
  ): Promise<Result<Category[]>>;
  createCategory(value: CategoryInput): Promise<Result<Category>>;
  updateCategory(
    id: string,
    value: Partial<CategoryInput> & { isArchived?: boolean },
  ): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  tags(signal?: AbortSignal): Promise<Result<Tag[]>>;
  createTag(value: TagInput): Promise<Result<Tag>>;
  updateTag(id: string, value: TagInput): Promise<void>;
  deleteTag(id: string): Promise<void>;
  transactions(
    filters: TransactionFilters,
    signal?: AbortSignal,
  ): Promise<Result<Transaction[]>>;
  createTransaction(value: TransactionInput): Promise<Result<Transaction>>;
  updateTransaction(id: string, value: TransactionInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  transactionTags(transactionId: string): Promise<Result<TransactionTag[]>>;
  addTransactionTag(transactionId: string, tagId: string): Promise<void>;
  removeTransactionTag(transactionId: string, tagId: string): Promise<void>;
  attachments(transactionId: string): Promise<Result<Attachment[]>>;
  uploadAttachment(
    transactionId: string,
    file: Blob & { name: string; type: string },
  ): Promise<Result<Attachment>>;
  deleteAttachment(id: string): Promise<void>;
  attachmentDownload(
    id: string,
  ): Promise<Result<{ downloadUrl: string; expiresAt: string }>>;
  budgets(
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<Result<Budget[]>>;
  budgetUsage(
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<Result<BudgetUsage[]>>;
  createBudget(value: BudgetInput): Promise<Result<Budget>>;
  updateBudget(id: string, value: Partial<BudgetInput>): Promise<void>;
  deleteBudget(id: string): Promise<void>;
  assignBudgetCategory(budgetId: string, categoryId: string): Promise<void>;
  removeBudgetCategory(budgetId: string, categoryId: string): Promise<void>;
  budgetCategories(budgetId: string): Promise<Result<BudgetCategory[]>>;
  envelopeAllocations(budgetId: string): Promise<Result<EnvelopeAllocation[]>>;
  allocateEnvelope(
    budgetId: string,
    value: {
      categoryId: string;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ): Promise<void>;
  envelopeTransfers(budgetId: string): Promise<Result<EnvelopeTransfer[]>>;
  transferEnvelope(
    budgetId: string,
    value: {
      fromCategoryId: string | null;
      toCategoryId: string | null;
      amount: string;
      occurredAt: string;
      note: string | null;
    },
  ): Promise<void>;
  devices(signal?: AbortSignal): Promise<Result<Device[]>>;
  updateDevice(id: string, name: string): Promise<void>;
  deleteDevice(id: string): Promise<void>;
  updateProfile(value: {
    name?: string | null;
    currency?: string;
  }): Promise<void>;
  deleteProfile(): Promise<void>;
}

export type AuthState =
  | { status: "restoring"; session: null }
  | { status: "anonymous"; session: null }
  | { status: "authenticated"; session: Session };

export interface SessionController {
  state(): AuthState;
  restore(): Promise<AuthState>;
  login(email: string, password: string): Promise<Session>;
  register(input: RegistrationInput): Promise<Session>;
  refresh(): Promise<Session>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  subscribe(listener: (state: AuthState) => void): () => void;
}

export interface SyncController {
  disconnect(): Promise<void>;
}

export class DisconnectedSyncController implements SyncController {
  async disconnect() {}
}

export interface LocalDatabaseLifecycle {
  identityFor(userId: string): Promise<string>;
  open(userId: string): Promise<void>;
  close(): Promise<void>;
  remove(userId: string): Promise<void>;
}

export interface ExpenseApplication {
  session: SessionController;
  data: ExpenseDataClient;
  sync: SyncController;
  localDatabase: LocalDatabaseLifecycle;
}
