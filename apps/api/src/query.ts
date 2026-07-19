import { z } from "zod";
import { HttpError } from "./http";

export const financialDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Invalid financial date");

const orderedPeriod = (boundary: z.ZodType<string>) =>
  z
    .object({ from: boundary, to: boundary })
    .refine((value) => value.from <= value.to, {
      message: "from must not be after to",
      path: ["to"],
    });

export const financialPeriodQuerySchema = orderedPeriod(financialDateSchema);
export const instantPeriodQuerySchema = orderedPeriod(z.iso.datetime());

export const transactionQuerySchema = z
  .object({
    accountId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    search: z.string().trim().min(1).max(200).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "from must not be after to",
    path: ["to"],
  });

export const resourceOptionsQuerySchema = z.object({
  includeArchived: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const categoryOptionsQuerySchema = resourceOptionsQuerySchema.extend({
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
});

export const attachmentQuerySchema = z.object({
  transactionId: z.string().uuid(),
});

export function queryValues(url: URL, keys: readonly string[]) {
  return Object.fromEntries(
    keys.map((key) => [key, url.searchParams.get(key) ?? undefined]),
  );
}

export function parseQuery<T extends z.ZodType>(
  schema: T,
  url: URL,
  keys: readonly string[],
  code = "INVALID_QUERY",
): z.output<T> {
  const parsed = schema.safeParse(queryValues(url, keys));
  if (!parsed.success)
    throw new HttpError(
      400,
      code,
      "Query parameters are invalid",
      parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean),
    );
  return parsed.data;
}
