import { prisma, type PrismaClient } from "../../client";
import type { CreateTransactionTagInput } from "./transactionTag.types";

export class TransactionTagRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateTransactionTagInput) {
    return this.db.transactionTag.create({ data });
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db.transactionTag.findMany({
      where: { transactionId, transaction: { userId } },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(transactionId: string, tagId: string, userId: string) {
    return this.db.transactionTag.delete({
      where: {
        transactionId_tagId: { transactionId, tagId },
        transaction: { userId },
      },
    });
  }
}
