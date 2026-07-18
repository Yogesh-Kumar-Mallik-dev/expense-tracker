import type {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
} from "@powersync/common";
import type { CredentialsProvider } from "./credentials";

export interface UploadTransaction {
  operations: CrudEntry[];
}

export interface OfflineConnectorOptions {
  credentials: CredentialsProvider;
  upload: (transaction: UploadTransaction) => Promise<void>;
  onPermanentConflict?: (conflict: {
    crudTransactionId: string;
    error: unknown;
    operations: CrudEntry[];
  }) => Promise<void>;
}

export class OfflineBackendConnector implements PowerSyncBackendConnector {
  constructor(private readonly options: OfflineConnectorOptions) {}

  fetchCredentials() {
    return this.options.credentials();
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    for await (const transaction of database.getCrudTransactions()) {
      try {
        await this.options.upload({ operations: transaction.crud });
      } catch (error) {
        if (!isPermanentConflict(error) || !this.options.onPermanentConflict)
          throw error;
        await this.options.onPermanentConflict({
          crudTransactionId: transaction.crud
            .map((entry) => `${entry.table}:${entry.id}`)
            .join("|"),
          error,
          operations: transaction.crud,
        });
        await transaction.complete();
        continue;
      }
      await transaction.complete();
    }
  }
}

function isPermanentConflict(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PERMANENT_SYNC_CONFLICT"
  );
}
