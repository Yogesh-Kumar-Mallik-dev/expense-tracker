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
} from "./contracts";

export type Result<T> = { data: T; meta?: PageMeta };

export interface ExpenseDataClient {
  accounts(signal?: AbortSignal): Promise<Result<Account[]>>;
  balances(signal?: AbortSignal): Promise<Result<AccountBalance[]>>;
  categories(signal?: AbortSignal): Promise<Result<Category[]>>;
  transactions(
    filters: TransactionFilters,
    signal?: AbortSignal,
  ): Promise<Result<Transaction[]>>;
  createTransaction(value: TransactionInput): Promise<Result<Transaction>>;
  updateTransaction(id: string, value: TransactionInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  budgets(from: string, to: string, signal?: AbortSignal): Promise<Result<Budget[]>>;
  budgetUsage(
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<Result<BudgetUsage[]>>;
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
