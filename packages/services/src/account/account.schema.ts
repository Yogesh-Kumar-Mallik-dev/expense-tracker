import { z } from "zod";
import { accountTypes } from "./account.types";

const moneySchema = z
  .string()
  .regex(/^-?\d+(?:\.\d{1,4})?$/, "Amount must be a decimal with at most four places");

export const createAccountSchema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(accountTypes).default("CASH"),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  openingBalance: moneySchema.default("0"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  icon: z.string().trim().min(1).max(100).nullable().optional(),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: z.enum(accountTypes).optional(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
    openingBalance: moneySchema.optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
    icon: z.string().trim().min(1).max(100).nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const accountIdSchema = z.uuid();
export const userIdSchema = z.uuid();
