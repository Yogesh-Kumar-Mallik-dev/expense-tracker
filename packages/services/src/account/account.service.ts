import type { Clock } from "../shared/time";
import { systemClock } from "../shared/time";
import type { IdFactory } from "../shared/id";
import { createUuid } from "../shared/id";
import {
  accountIdSchema,
  createAccountSchema,
  updateAccountSchema,
  userIdSchema,
} from "./account.schema";
import type {
  AccountRecord,
  AccountRepositoryPort,
  CreateAccountInput,
  UpdateAccountInput,
} from "./account.types";

export class AccountService {
  constructor(
    private readonly accounts: AccountRepositoryPort,
    private readonly idFactory: IdFactory = createUuid,
    private readonly clock: Clock = systemClock,
  ) {}

  // Concurrency note: Safe single-row insert with a UUID assigned before writing; DB uniqueness conflicts are surfaced for rename/merge recovery.
  async create(input: CreateAccountInput): Promise<AccountRecord> {
    const value = createAccountSchema.parse(input);
    const now = this.clock();
    const account: AccountRecord = {
      id: this.idFactory(),
      userId: value.userId,
      name: value.name,
      type: value.type,
      currency: value.currency,
      openingBalance: value.openingBalance,
      color: value.color ?? null,
      icon: value.icon ?? null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.accounts.create(account);
    return account;
  }

  // Concurrency note: Safe read-only lookup; it does not derive a value that is later persisted.
  get(id: string, userId: string) {
    return this.accounts.findById(accountIdSchema.parse(id), userIdSchema.parse(userId));
  }

  // Concurrency note: Safe read-only query; archived filtering does not affect synchronization state.
  list(userId: string, includeArchived = false) {
    return this.accounts.listByUser(userIdSchema.parse(userId), includeArchived);
  }

  // Concurrency note: Safe single-row field replacement; no field is computed from a previously read value.
  async update(id: string, userId: string, input: UpdateAccountInput) {
    const accountId = accountIdSchema.parse(id);
    const ownerId = userIdSchema.parse(userId);
    const value = updateAccountSchema.parse(input);
    const updates: UpdateAccountInput = {};
    if (value.name !== undefined) updates.name = value.name;
    if (value.type !== undefined) updates.type = value.type;
    if (value.currency !== undefined) updates.currency = value.currency;
    if (value.openingBalance !== undefined) updates.openingBalance = value.openingBalance;
    if (value.color !== undefined) updates.color = value.color;
    if (value.icon !== undefined) updates.icon = value.icon;
    if (value.isArchived !== undefined) updates.isArchived = value.isArchived;
    await this.accounts.update(accountId, ownerId, { ...updates, updatedAt: this.clock() });
  }

  // Concurrency note: Safe idempotent single-row tombstone write; the repository never physically deletes synced data.
  async delete(id: string, userId: string) {
    await this.accounts.delete(accountIdSchema.parse(id), userIdSchema.parse(userId));
  }
}
