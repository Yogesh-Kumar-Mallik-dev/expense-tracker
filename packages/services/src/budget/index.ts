import { z } from "zod";
import { SingleRowService, type CrudRepositoryPort } from "../shared";
import { moneySchema } from "../transaction";
export interface BudgetRecord {
  id: string;
  userId: string;
  name: string;
  amount: string;
  currency: string;
  startsOn: string;
  endsOn: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface CreateBudgetInput {
  userId: string;
  name: string;
  amount: string;
  currency: string;
  startsOn: string;
  endsOn: string;
}
export type UpdateBudgetInput = Partial<
  Pick<BudgetRecord, "name" | "amount" | "currency" | "startsOn" | "endsOn">
>;
export interface BudgetRepositoryPort extends CrudRepositoryPort<
  BudgetRecord,
  UpdateBudgetInput
> {
  listForPeriod(
    userId: string,
    from: string,
    to: string,
  ): Promise<BudgetRecord[]>;
}
const schema = z
  .object({
    userId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    amount: moneySchema,
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    message: "Budget end must not precede start",
    path: ["endsOn"],
  });
const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    amount: moneySchema.optional(),
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase())
      .optional(),
    startsOn: z.iso.date().optional(),
    endsOn: z.iso.date().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
export class BudgetService extends SingleRowService<
  BudgetRecord,
  CreateBudgetInput,
  UpdateBudgetInput
> {
  constructor(repository: BudgetRepositoryPort) {
    super(repository);
  }
  // Concurrency note: N/A - pure validation and record construction; no stored totals are mutated.
  protected build(
    input: CreateBudgetInput,
    id: string,
    now: string,
  ): BudgetRecord {
    const v = schema.parse(input);
    return { id, ...v, createdAt: now, updatedAt: now, deletedAt: null };
  }
  // Concurrency note: N/A - pure replacement validation; aggregate budget usage is never persisted here.
  protected parseUpdate(input: UpdateBudgetInput) {
    return updateSchema.parse(input) as UpdateBudgetInput;
  }
  // Concurrency note: Safe read-only range query; date strings select records and do not resolve write conflicts.
  listForPeriod(userId: string, from: string, to: string) {
    return (this.repository as BudgetRepositoryPort).listForPeriod(
      z.uuid().parse(userId),
      z.iso.date().parse(from),
      z.iso.date().parse(to),
    );
  }
}
