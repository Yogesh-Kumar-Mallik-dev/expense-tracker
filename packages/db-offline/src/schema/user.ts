import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "User",
  {
    id: text("id").primaryKey().notNull(),
    email: text("email").notNull().unique(),
    name: text("name"),
    currency: text("currency", { length: 3 }).notNull().default("USD"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [index("User_email_idx").on(table.email)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
