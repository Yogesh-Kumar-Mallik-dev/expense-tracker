export * from "./account";
export * from "./attachment";
export * from "./budget";
export * from "./category";
export * from "./device";
export * from "./refreshToken";
export * from "./sync";
export * from "./tag";
export * from "./transaction";
export * from "./user";

import { accounts } from "./account";
import { attachments } from "./attachment";
import { budgetTransfers, budgets, envelopeAllocations } from "./budget";
import { budgetCategories, categories } from "./category";
import { devices } from "./device";
import { refreshTokens } from "./refreshToken";
import { syncConflicts, syncStates } from "./sync";
import { tags, transactionTags } from "./tag";
import { transactions } from "./transaction";
import { users } from "./user";

export const drizzleSchema = {
  users,
  accounts,
  categories,
  budgets,
  envelopeAllocations,
  budgetTransfers,
  budgetCategories,
  transactions,
  tags,
  transactionTags,
  attachments,
  devices,
  refreshTokens,
  syncStates,
  syncConflicts,
};
