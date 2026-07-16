import { prisma, type PrismaClient } from "../../client";
import type { CreateAttachmentInput } from "./attachment.types";

export class AttachmentRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(data: CreateAttachmentInput) {
    return this.db.attachment.create({ data });
  }

  findById(id: string, userId: string) {
    return this.db.attachment.findFirst({ where: { id, userId } });
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db.attachment.findMany({
      where: { transactionId, userId },
      orderBy: { createdAt: "asc" },
    });
  }

  delete(id: string, userId: string) {
    return this.db.attachment.delete({ where: { id, userId } });
  }
}
