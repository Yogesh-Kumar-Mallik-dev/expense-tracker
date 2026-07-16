export const accountTypes = [
  "CASH",
  "CHECKING",
  "SAVINGS",
  "CREDIT_CARD",
  "WALLET",
  "OTHER",
] as const;

export type AccountType = (typeof accountTypes)[number];

export interface AccountRecord {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateAccountInput {
  userId: string;
  name: string;
  type?: AccountType;
  currency: string;
  openingBalance?: string;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  currency?: string;
  openingBalance?: string;
  color?: string | null;
  icon?: string | null;
  isArchived?: boolean;
}

export interface AccountRepositoryPort {
  create(account: AccountRecord): Promise<unknown>;
  findById(id: string, userId: string): Promise<AccountRecord | null>;
  listByUser(userId: string, includeArchived?: boolean): Promise<AccountRecord[]>;
  update(
    id: string,
    userId: string,
    account: UpdateAccountInput & { updatedAt: string },
  ): Promise<unknown>;
  delete(id: string, userId: string): Promise<unknown>;
}
