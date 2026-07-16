import { prisma, type PrismaClient } from "../../client";
import type {
  CreateTransactionInput,
  TransactionFilters,
  UpdateTransactionInput,
} from "./transaction.types";

export class TransactionRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateTransactionInput) {
    return this.db.transaction.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        account: true,
        category: true,
        tags: { where: { deletedAt: null, tag: { deletedAt: null } }, include: { tag: true } },
        attachments: { where: { deletedAt: null } },
      },
    });
  }

  listByUser(userId: string, filters: TransactionFilters = {}) {
    const { accountId, categoryId, from, to, skip, take = 50 } = filters;
    return this.db.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(accountId ? { accountId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: {
        account: true,
        category: true,
        tags: { where: { deletedAt: null, tag: { deletedAt: null } }, include: { tag: true } },
        attachments: { where: { deletedAt: null } },
      },
      orderBy: { occurredAt: "desc" },
      ...(skip === undefined ? {} : { skip }),
      take,
    });
  }

  update(id: string, userId: string, data: UpdateTransactionInput) {
    return this.db.transaction.update({ where: { id, userId, deletedAt: null }, data });
  }

  delete(id: string, userId: string) {
    return this.db.transaction.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
