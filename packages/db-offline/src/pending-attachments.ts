import { and, eq } from "drizzle-orm";
import type { OfflineDatabase } from "./database";
import { pendingAttachmentUploads } from "./schema";

const STORE = "attachment-bytes";

export class PersistentAttachmentQueue {
  constructor(
    private readonly db: OfflineDatabase,
    private readonly userId: string,
    private readonly uploadRemote: (
      transactionId: string,
      file: Blob & { name: string; type: string },
      attachmentId: string,
    ) => Promise<void>,
    private readonly onCount?: (count: number) => void,
  ) {}

  async enqueue(
    transactionId: string,
    file: Blob & { name: string; type: string },
  ) {
    const attachmentId = crypto.randomUUID();
    await writeBlob(attachmentId, file);
    const now = new Date().toISOString();
    await this.db.insert(pendingAttachmentUploads).values({
      id: crypto.randomUUID(),
      userId: this.userId,
      attachmentId,
      transactionId,
      localUri: `indexeddb:${attachmentId}`,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    });
    await this.emitCount();
    try {
      await this.process(attachmentId);
    } catch {
      // The durable queue owns retry; transaction creation remains successful.
    }
    return attachmentId;
  }

  async drain() {
    const pending = await this.db
      .select()
      .from(pendingAttachmentUploads)
      .where(eq(pendingAttachmentUploads.userId, this.userId));
    for (const item of pending) {
      try {
        await this.process(item.attachmentId);
      } catch {
        // Continue processing unrelated attachment uploads.
      }
    }
    await this.emitCount();
  }

  async clear() {
    const pending = await this.db
      .select({ attachmentId: pendingAttachmentUploads.attachmentId })
      .from(pendingAttachmentUploads)
      .where(eq(pendingAttachmentUploads.userId, this.userId));
    await this.db
      .delete(pendingAttachmentUploads)
      .where(eq(pendingAttachmentUploads.userId, this.userId));
    await Promise.all(
      pending.map(({ attachmentId }) => deleteBlob(attachmentId)),
    );
    await this.emitCount();
  }

  private async process(attachmentId: string) {
    const item = (
      await this.db
        .select()
        .from(pendingAttachmentUploads)
        .where(
          and(
            eq(pendingAttachmentUploads.userId, this.userId),
            eq(pendingAttachmentUploads.attachmentId, attachmentId),
          ),
        )
        .limit(1)
    )[0];
    if (!item) return;
    const blob = await readBlob(attachmentId);
    if (!blob) throw new Error("Pending attachment bytes are unavailable");
    const file = new File([blob], item.fileName, { type: item.mimeType });
    try {
      await this.uploadRemote(item.transactionId, file, attachmentId);
      await this.db
        .delete(pendingAttachmentUploads)
        .where(eq(pendingAttachmentUploads.attachmentId, attachmentId));
      await deleteBlob(attachmentId);
    } catch (caught) {
      await this.db
        .update(pendingAttachmentUploads)
        .set({
          status: "FAILED",
          attempts: item.attempts + 1,
          lastError:
            caught instanceof Error
              ? caught.message
              : "Attachment upload failed",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pendingAttachmentUploads.attachmentId, attachmentId));
      throw caught;
    } finally {
      await this.emitCount();
    }
  }

  private async emitCount() {
    if (!this.onCount) return;
    const values = await this.db
      .select({ id: pendingAttachmentUploads.id })
      .from(pendingAttachmentUploads)
      .where(eq(pendingAttachmentUploads.userId, this.userId));
    this.onCount(values.length);
  }
}

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("expense-tracker-local-files", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function writeBlob(id: string, blob: Blob) {
  const db = await database();
  await transactionPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).put(blob, id),
  );
  db.close();
}
async function readBlob(id: string) {
  const db = await database();
  const value = await transactionPromise<Blob | undefined>(
    db.transaction(STORE).objectStore(STORE).get(id),
  );
  db.close();
  return value;
}
async function deleteBlob(id: string) {
  const db = await database();
  await transactionPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(id),
  );
  db.close();
}
function transactionPromise<T = undefined>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
