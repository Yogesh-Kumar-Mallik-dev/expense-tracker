import { prisma, type PrismaClient } from "../../client";
import type { CreateAttachmentInput } from "./attachment.types";

export class AttachmentRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateAttachmentInput) {
    return this.db.attachment.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.attachment.findFirst({ where: { id, userId, deletedAt: null } });
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db.attachment.findMany({
      where: { transactionId, userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(id: string, userId: string) {
    return this.db.attachment.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
