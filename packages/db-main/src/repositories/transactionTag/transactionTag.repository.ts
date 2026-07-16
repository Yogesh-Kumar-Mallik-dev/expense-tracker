import { prisma, type PrismaClient } from "../../client";
import type { CreateTransactionTagInput } from "./transactionTag.types";

export class TransactionTagRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateTransactionTagInput) {
    return this.db.transactionTag.create({ data });
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db.transactionTag.findMany({
      where: {
        transactionId,
        deletedAt: null,
        transaction: { userId, deletedAt: null },
        tag: { deletedAt: null },
      },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(transactionId: string, tagId: string, userId: string) {
    return this.db.transactionTag.updateMany({
      where: {
        transactionId,
        tagId,
        deletedAt: null,
        transaction: { userId, deletedAt: null },
      },
      data: { deletedAt: new Date() },
    });
  }
}
