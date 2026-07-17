import { z } from "zod";
import type { IdFactory, Clock } from "../shared";
import { createUuid, parseUuid, systemClock } from "../shared";
export interface AttachmentRecord {
  id: string;
  userId: string;
  transactionId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  deletedAt: string | null;
}
export type CreateAttachmentInput = Omit<
  AttachmentRecord,
  "id" | "createdAt" | "deletedAt"
> & { id?: string };
export interface AttachmentRepositoryPort {
  create(v: AttachmentRecord): Promise<unknown>;
  findById(id: string, userId: string): Promise<AttachmentRecord | null>;
  listByTransaction(
    transactionId: string,
    userId: string,
  ): Promise<AttachmentRecord[]>;
  delete(id: string, userId: string): Promise<unknown>;
}
const schema = z.object({
  id: z.uuid().optional(),
  userId: z.uuid(),
  transactionId: z.uuid(),
  fileName: z.string().trim().min(1).max(255),
  storageKey: z.string().trim().min(1).max(1024),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.int().nonnegative(),
});
export class AttachmentService {
  constructor(
    private readonly repository: AttachmentRepositoryPort,
    private readonly idFactory: IdFactory = createUuid,
    private readonly clock: Clock = systemClock,
  ) {}
  // Concurrency note: Safe single-row metadata insert with a preassigned UUID; binary upload lifecycle is independent and recoverable.
  async create(input: CreateAttachmentInput) {
    const v = schema.parse(input);
    const { id, ...metadata } = v;
    const record: AttachmentRecord = {
      id: id ? parseUuid(id) : parseUuid(this.idFactory()),
      ...metadata,
      createdAt: this.clock(),
      deletedAt: null,
    };
    await this.repository.create(record);
    return record;
  }
  // Concurrency note: Safe read-only lookup with no implicit write.
  get(id: string, userId: string) {
    return this.repository.findById(z.uuid().parse(id), z.uuid().parse(userId));
  }
  // Concurrency note: Safe read-only query; a transaction remains valid while attachment metadata sync is partial.
  listByTransaction(transactionId: string, userId: string) {
    return this.repository.listByTransaction(
      z.uuid().parse(transactionId),
      z.uuid().parse(userId),
    );
  }
  // Concurrency note: Safe idempotent metadata tombstone; remote file garbage collection is a separate backend retention concern.
  async delete(id: string, userId: string) {
    await this.repository.delete(z.uuid().parse(id), z.uuid().parse(userId));
  }
}
