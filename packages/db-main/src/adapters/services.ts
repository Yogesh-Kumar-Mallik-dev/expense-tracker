import type {
  AccountRecord,
  AccountRepositoryPort,
  AssignmentRepositoryPort,
  AttachmentRecord,
  AttachmentRepositoryPort,
  BudgetCategoryRecord,
  BudgetRecord,
  BudgetRepositoryPort,
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
  UpdateAccountInput,
  UpdateBudgetInput,
  UpdateCategoryInput,
  UpdateDeviceInput,
  UpdateTagInput,
  UpdateTransactionInput,
  UpdateUserInput,
} from "@expense-tracker/services";
import { prisma, type PrismaClient } from "../client";
import type {
  Account as PrismaAccount,
  Attachment as PrismaAttachment,
  Budget as PrismaBudget,
  Category as PrismaCategory,
  Device as PrismaDevice,
  Tag as PrismaTag,
  Transaction as PrismaTransaction,
  User as PrismaUser,
} from "../generated/prisma/client";
const iso = (v: Date | null) => v?.toISOString() ?? null;
const account = (v: PrismaAccount): AccountRecord => ({
  ...v,
  openingBalance: v.openingBalance.toString(),
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const category = (v: PrismaCategory): CategoryRecord => ({
  ...v,
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const budget = (v: PrismaBudget): BudgetRecord => ({
  ...v,
  amount: v.amount.toString(),
  startsOn: v.startsOn.toISOString().slice(0, 10),
  endsOn: v.endsOn.toISOString().slice(0, 10),
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const transaction = (v: PrismaTransaction): TransactionRecord => ({
  ...v,
  amount: v.amount.toString(),
  occurredAt: v.occurredAt.toISOString(),
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const tag = (v: PrismaTag): TagRecord => ({
  ...v,
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const attachment = (v: PrismaAttachment): AttachmentRecord => ({
  ...v,
  createdAt: v.createdAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const device = (v: PrismaDevice): DeviceRecord => ({
  ...v,
  lastSeenAt: v.lastSeenAt.toISOString(),
  createdAt: v.createdAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
const user = (v: PrismaUser): UserRecord => ({
  id: v.id,
  email: v.email,
  name: v.name,
  currency: v.currency,
  createdAt: v.createdAt.toISOString(),
  updatedAt: v.updatedAt.toISOString(),
  deletedAt: iso(v.deletedAt),
});
export class MainAccountAdapter implements AccountRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: AccountRecord) {
    await this.db.account.create({
      data: {
        ...v,
        openingBalance: v.openingBalance,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.account.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? account(v) : null;
  }
  async listByUser(u: string, a = false) {
    return (
      await this.db.account.findMany({
        where: {
          userId: u,
          deletedAt: null,
          ...(a ? {} : { isArchived: false }),
        },
        orderBy: { name: "asc" },
      })
    ).map(account);
  }
  async update(
    id: string,
    u: string,
    v: UpdateAccountInput & { updatedAt: string },
  ) {
    await this.db.account.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { ...v, updatedAt: new Date(v.updatedAt) },
    });
  }
  async delete(id: string, u: string) {
    await this.db.account.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainCategoryAdapter implements CategoryRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: CategoryRecord) {
    await this.db.category.create({
      data: {
        ...v,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.category.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? category(v) : null;
  }
  async listByUser(u: string, t?: CategoryRecord["type"], a = false) {
    return (
      await this.db.category.findMany({
        where: {
          userId: u,
          deletedAt: null,
          ...(t ? { type: t } : {}),
          ...(a ? {} : { isArchived: false }),
        },
      })
    ).map(category);
  }
  async update(
    id: string,
    u: string,
    v: UpdateCategoryInput & { updatedAt: string },
  ) {
    await this.db.category.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { ...v, updatedAt: new Date(v.updatedAt) },
    });
  }
  async delete(id: string, u: string) {
    await this.db.category.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainTagAdapter implements TagRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: TagRecord) {
    await this.db.tag.create({
      data: {
        ...v,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.tag.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? tag(v) : null;
  }
  async listByUser(u: string) {
    return (
      await this.db.tag.findMany({ where: { userId: u, deletedAt: null } })
    ).map(tag);
  }
  async update(
    id: string,
    u: string,
    v: UpdateTagInput & { updatedAt: string },
  ) {
    await this.db.tag.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { ...v, updatedAt: new Date(v.updatedAt) },
    });
  }
  async delete(id: string, u: string) {
    await this.db.tag.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainBudgetAdapter implements BudgetRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: BudgetRecord) {
    await this.db.budget.create({
      data: {
        ...v,
        amount: v.amount,
        startsOn: new Date(v.startsOn),
        endsOn: new Date(v.endsOn),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.budget.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? budget(v) : null;
  }
  async listForPeriod(u: string, f: string, t: string) {
    return (
      await this.db.budget.findMany({
        where: {
          userId: u,
          deletedAt: null,
          startsOn: { lte: new Date(t) },
          endsOn: { gte: new Date(f) },
        },
      })
    ).map(budget);
  }
  async update(
    id: string,
    u: string,
    v: UpdateBudgetInput & { updatedAt: string },
  ) {
    await this.db.budget.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: {
        ...v,
        ...(v.startsOn ? { startsOn: new Date(v.startsOn) } : {}),
        ...(v.endsOn ? { endsOn: new Date(v.endsOn) } : {}),
        updatedAt: new Date(v.updatedAt),
      },
    });
  }
  async delete(id: string, u: string) {
    await this.db.budget.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainTransactionAdapter implements TransactionRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: TransactionRecord) {
    await this.db.transaction.create({
      data: {
        ...v,
        amount: v.amount,
        occurredAt: new Date(v.occurredAt),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.transaction.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? transaction(v) : null;
  }
  async listByUser(
    u: string,
    f: Parameters<TransactionRepositoryPort["listByUser"]>[1] = {},
  ) {
    return (
      await this.db.transaction.findMany({
        where: {
          userId: u,
          deletedAt: null,
          ...(f.accountId ? { accountId: f.accountId } : {}),
          ...(f.categoryId ? { categoryId: f.categoryId } : {}),
          ...(f.from || f.to
            ? {
                occurredAt: {
                  ...(f.from ? { gte: new Date(f.from) } : {}),
                  ...(f.to ? { lte: new Date(f.to) } : {}),
                },
              }
            : {}),
        },
        ...(f.offset === undefined ? {} : { skip: f.offset }),
        take: f.limit ?? 50,
        orderBy: { occurredAt: "desc" },
      })
    ).map(transaction);
  }
  async update(
    id: string,
    u: string,
    v: UpdateTransactionInput & { updatedAt: string },
  ) {
    await this.db.transaction.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: {
        ...(v.type === undefined ? {} : { type: v.type }),
        ...(v.currency === undefined ? {} : { currency: v.currency }),
        ...(v.amount === undefined ? {} : { amount: v.amount }),
        ...(v.categoryId === undefined ? {} : { categoryId: v.categoryId }),
        ...(v.description === undefined ? {} : { description: v.description }),
        ...(v.note === undefined ? {} : { note: v.note }),
        ...(v.accountId === undefined ? {} : { accountId: v.accountId }),
        ...(v.transferAccountId === undefined
          ? {}
          : { transferAccountId: v.transferAccountId }),
        ...(v.occurredAt ? { occurredAt: new Date(v.occurredAt) } : {}),
        updatedAt: new Date(v.updatedAt),
      },
    });
  }
  async delete(id: string, u: string) {
    await this.db.transaction.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainAttachmentAdapter implements AttachmentRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: AttachmentRecord) {
    await this.db.attachment.create({
      data: { ...v, createdAt: new Date(v.createdAt), deletedAt: null },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.attachment.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? attachment(v) : null;
  }
  async listByTransaction(id: string, u: string) {
    return (
      await this.db.attachment.findMany({
        where: { transactionId: id, userId: u, deletedAt: null },
      })
    ).map(attachment);
  }
  async delete(id: string, u: string) {
    await this.db.attachment.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainDeviceAdapter implements DeviceRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: DeviceRecord) {
    await this.db.device.create({
      data: {
        ...v,
        lastSeenAt: new Date(v.lastSeenAt),
        createdAt: new Date(v.createdAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string, u: string) {
    const v = await this.db.device.findFirst({
      where: { id, userId: u, deletedAt: null },
    });
    return v ? device(v) : null;
  }
  async listByUser(u: string) {
    return (
      await this.db.device.findMany({ where: { userId: u, deletedAt: null } })
    ).map(device);
  }
  async update(id: string, u: string, v: UpdateDeviceInput) {
    await this.db.device.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: {
        ...v,
        ...(v.lastSeenAt ? { lastSeenAt: new Date(v.lastSeenAt) } : {}),
      },
    });
  }
  async delete(id: string, u: string) {
    await this.db.device.updateMany({
      where: { id, userId: u, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainUserAdapter implements UserRepositoryPort {
  constructor(
    private passwordHash: (v: UserRecord) => Promise<string>,
    private db: PrismaClient = prisma,
  ) {}
  async create(v: UserRecord) {
    await this.db.user.create({
      data: {
        ...v,
        passwordHash: await this.passwordHash(v),
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
        deletedAt: null,
      },
    });
  }
  async findById(id: string) {
    const v = await this.db.user.findFirst({ where: { id, deletedAt: null } });
    return v ? user(v) : null;
  }
  async findByEmail(email: string) {
    const v = await this.db.user.findFirst({
      where: { email, deletedAt: null },
    });
    return v ? user(v) : null;
  }
  async update(
    id: string,
    _u: string,
    v: UpdateUserInput & { updatedAt: string },
  ) {
    await this.db.user.updateMany({
      where: { id, deletedAt: null },
      data: { ...v, updatedAt: new Date(v.updatedAt) },
    });
  }
  async delete(id: string) {
    await this.db.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainBudgetCategoryAdapter implements AssignmentRepositoryPort<BudgetCategoryRecord> {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: BudgetCategoryRecord) {
    await this.db.budgetCategory.create({
      data: { ...v, createdAt: new Date(v.createdAt), deletedAt: null },
    });
  }
  async list(p: string, u: string) {
    return (
      await this.db.budgetCategory.findMany({
        where: {
          budgetId: p,
          deletedAt: null,
          budget: { userId: u, deletedAt: null },
        },
      })
    ).map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      deletedAt: iso(v.deletedAt),
    }));
  }
  async delete(p: string, c: string, u: string) {
    await this.db.budgetCategory.updateMany({
      where: {
        budgetId: p,
        categoryId: c,
        deletedAt: null,
        budget: { userId: u, deletedAt: null },
      },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainTransactionTagAdapter implements AssignmentRepositoryPort<TransactionTagRecord> {
  constructor(private db: PrismaClient = prisma) {}
  async create(v: TransactionTagRecord) {
    await this.db.transactionTag.create({
      data: { ...v, createdAt: new Date(v.createdAt), deletedAt: null },
    });
  }
  async list(p: string, u: string) {
    return (
      await this.db.transactionTag.findMany({
        where: {
          transactionId: p,
          deletedAt: null,
          transaction: { userId: u, deletedAt: null },
        },
      })
    ).map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      deletedAt: iso(v.deletedAt),
    }));
  }
  async delete(p: string, c: string, u: string) {
    await this.db.transactionTag.updateMany({
      where: {
        transactionId: p,
        tagId: c,
        deletedAt: null,
        transaction: { userId: u, deletedAt: null },
      },
      data: { deletedAt: new Date() },
    });
  }
}
export class MainReportingAdapter implements ReportingRepositoryPort {
  constructor(private db: PrismaClient = prisma) {}
  async listAccounts(u: string) {
    return (
      await this.db.account.findMany({ where: { userId: u, deletedAt: null } })
    ).map(account);
  }
  async listTransactions(u: string, f?: string, t?: string) {
    return (
      await this.db.transaction.findMany({
        where: {
          userId: u,
          deletedAt: null,
          ...(f || t
            ? {
                occurredAt: {
                  ...(f ? { gte: new Date(f) } : {}),
                  ...(t ? { lte: new Date(t) } : {}),
                },
              }
            : {}),
        },
      })
    ).map(transaction);
  }
  async listBudgets(u: string, f: string, t: string) {
    return (
      await this.db.budget.findMany({
        where: {
          userId: u,
          deletedAt: null,
          startsOn: { lte: new Date(t) },
          endsOn: { gte: new Date(f) },
        },
      })
    ).map(budget);
  }
  async listBudgetCategories(ids: string[]) {
    if (!ids.length) return [];
    return (
      await this.db.budgetCategory.findMany({
        where: { budgetId: { in: ids }, deletedAt: null },
      })
    ).map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      deletedAt: iso(v.deletedAt),
    }));
  }
}
