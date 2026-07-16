import { z } from "zod";

export const moneySchema = z.string().regex(/^\d+(?:\.\d{1,4})?$/);
export const createTransactionSchema = z.object({
  userId: z.uuid(), accountId: z.uuid(), transferAccountId: z.uuid().nullable().default(null),
  categoryId: z.uuid().nullable().default(null), type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: moneySchema, currency: z.string().length(3).transform((v) => v.toUpperCase()),
  description: z.string().trim().max(240).nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null), occurredAt: z.iso.datetime(),
}).superRefine((value, context) => {
  if (value.type === "TRANSFER" && !value.transferAccountId) context.addIssue({ code: "custom", message: "Transfers require a destination account", path: ["transferAccountId"] });
  if (value.type !== "TRANSFER" && value.transferAccountId) context.addIssue({ code: "custom", message: "Only transfers may have a destination account", path: ["transferAccountId"] });
  if (value.transferAccountId === value.accountId) context.addIssue({ code: "custom", message: "Transfer accounts must differ", path: ["transferAccountId"] });
});
export const updateTransactionSchema = createTransactionSchema.omit({ userId: true }).partial().refine((v) => Object.keys(v).length > 0);
