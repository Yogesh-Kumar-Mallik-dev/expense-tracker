import { z } from "zod";

export const moneySchema = z.string().regex(/^\d+(?:\.\d{1,4})?$/);
export const positiveMoneySchema = moneySchema.refine(
  (value) => /[1-9]/.test(value),
  "Amount must be greater than zero",
);
const transactionFields = z.object({
  userId: z.uuid(),
  accountId: z.uuid(),
  transferAccountId: z.uuid().nullable().default(null),
  categoryId: z.uuid().nullable().default(null),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: positiveMoneySchema,
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
  description: z.string().trim().max(240).nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null),
  importFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .default(null),
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
  if (value.type === "TRANSFER" && "categoryId" in value && value.categoryId)
    context.addIssue({
      code: "custom",
      message: "Transfers cannot have a category",
      path: ["categoryId"],
    });
};

export const createTransactionSchema =
  transactionFields.superRefine(validateTransfer);
export const updateTransactionSchema = transactionFields
  .omit({ userId: true, importFingerprint: true })
  .partial()
  .required({ accountId: true, transferAccountId: true, type: true })
  .superRefine(validateTransfer);
