import { z } from "zod";

export const moneySchema = z.string().regex(/^\d+(?:\.\d{1,4})?$/);
const transactionFields = z.object({
  userId: z.uuid(),
  accountId: z.uuid(),
  transferAccountId: z.uuid().nullable().default(null),
  categoryId: z.uuid().nullable().default(null),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: moneySchema,
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
  description: z.string().trim().max(240).nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null),
  occurredAt: z.iso.datetime(),
});

// Concurrency note: N/A - pure validation of a complete replacement tuple; it never reads stored transaction state.
const validateTransfer = (
  value: {
    type: "EXPENSE" | "INCOME" | "TRANSFER";
    accountId: string;
    transferAccountId: string | null;
  },
  context: z.RefinementCtx,
) => {
  if (value.type === "TRANSFER" && !value.transferAccountId)
    context.addIssue({
      code: "custom",
      message: "Transfers require a destination account",
      path: ["transferAccountId"],
    });
  if (value.type !== "TRANSFER" && value.transferAccountId)
    context.addIssue({
      code: "custom",
      message: "Only transfers may have a destination account",
      path: ["transferAccountId"],
    });
  if (value.transferAccountId === value.accountId)
    context.addIssue({
      code: "custom",
      message: "Transfer accounts must differ",
      path: ["transferAccountId"],
    });
};

export const createTransactionSchema =
  transactionFields.superRefine(validateTransfer);
export const updateTransactionSchema = transactionFields
  .omit({ userId: true })
  .partial()
  .required({ accountId: true, transferAccountId: true, type: true })
  .superRefine(validateTransfer);
