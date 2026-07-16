import { and, asc, eq, isNull } from "drizzle-orm";
import type { OfflineDatabase } from "../../database";
import { attachments } from "../../schema";
import type { CreateAttachmentInput } from "./attachment.types";

export class AttachmentRepository {
  constructor(private readonly db: OfflineDatabase) {}

  create(data: CreateAttachmentInput) {
    return this.db.insert(attachments).values(data);
  }

  async findById(id: string, userId: string) {
    return (await this.db.select().from(attachments).where(and(eq(attachments.id, id), eq(attachments.userId, userId), isNull(attachments.deletedAt))).limit(1))[0] ?? null;
  }

  listByTransaction(transactionId: string, userId: string) {
    return this.db.select().from(attachments).where(and(
      eq(attachments.transactionId, transactionId),
      eq(attachments.userId, userId),
      isNull(attachments.deletedAt),
    )).orderBy(asc(attachments.createdAt));
  }

  delete(id: string, userId: string) {
    return this.db.update(attachments).set({ deletedAt: new Date().toISOString() }).where(and(eq(attachments.id, id), eq(attachments.userId, userId), isNull(attachments.deletedAt)));
  }
}
