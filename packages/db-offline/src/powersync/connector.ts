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
}

export class OfflineBackendConnector implements PowerSyncBackendConnector {
  constructor(private readonly options: OfflineConnectorOptions) {}

  fetchCredentials() {
    return this.options.credentials();
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    for await (const transaction of database.getCrudTransactions()) {
      await this.options.upload({ operations: transaction.crud });
      await transaction.complete();
    }
  }
}
