import { z } from "zod";

const rowSchema = z
  .object({
    date: z.iso.date(),
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
    amount: z.string().regex(/^[1-9]\d*(?:\.\d{1,4})?$|^0\.\d{1,4}$/),
    currency: z.string().length(3),
    account: z.string().min(1),
    transferAccount: z.string(),
    category: z.string(),
    description: z.string(),
    note: z.string(),
  })
  .superRefine((value, context) => {
    if (value.type === "TRANSFER" && !value.transferAccount)
      context.addIssue({
        code: "custom",
        path: ["transferAccount"],
        message: "is required for transfers",
      });
    if (value.type === "TRANSFER" && value.category)
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "must be empty for transfers",
      });
    if (value.type !== "TRANSFER" && value.transferAccount)
      context.addIssue({
        code: "custom",
        path: ["transferAccount"],
        message: "is only valid for transfers",
      });
  });

export type TransactionCsvRow = z.infer<typeof rowSchema>;
export interface CsvImportPreview {
  valid: Array<{ rowNumber: number; value: TransactionCsvRow }>;
  invalid: Array<{ rowNumber: number; message: string }>;
}

const headers = [
  "date",
  "type",
  "amount",
  "currency",
  "account",
  "transferAccount",
  "category",
  "description",
  "note",
] as const;

export function previewTransactionCsv(source: string): CsvImportPreview {
  const rows = parseCsv(source.replace(/^\uFEFF/, ""));
  if (!rows.length)
    return { valid: [], invalid: [{ rowNumber: 1, message: "CSV is empty" }] };
  const headerRow = rows[0]!;
  const positions = new Map(
    headerRow.map((value, index) => [value.trim(), index]),
  );
  const missing = headers.filter((header) => !positions.has(header));
  if (missing.length)
    return {
      valid: [],
      invalid: [
        { rowNumber: 1, message: `Missing columns: ${missing.join(", ")}` },
      ],
    };
  const preview: CsvImportPreview = { valid: [], invalid: [] };
  rows.slice(1).forEach((columns, index) => {
    if (columns.every((value) => !value.trim())) return;
    const raw = Object.fromEntries(
      headers.map((header) => [
        header,
        columns[positions.get(header)!]?.trim() ?? "",
      ]),
    ) as Record<(typeof headers)[number], string>;
    const parsed = rowSchema.safeParse({
      ...raw,
      type: raw.type.toUpperCase(),
      currency: raw.currency.toUpperCase(),
    });
    if (parsed.success)
      preview.valid.push({ rowNumber: index + 2, value: parsed.data });
    else
      preview.invalid.push({
        rowNumber: index + 2,
        message: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
  });
  return preview;
}

export function writeTransactionCsv(rows: TransactionCsvRow[]) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => quote(row[header])).join(",")),
  ].join("\r\n");
}

export async function fingerprintTransactionCsvRow(
  row: TransactionCsvRow,
  references: {
    accountId: string;
    transferAccountId: string | null;
    categoryId: string | null;
  },
) {
  const normalized = JSON.stringify([
    references.accountId,
    row.type,
    row.date,
    row.amount.replace(/(?:\.0+|(\.\d*?)0+)$/, "$1"),
    row.currency.toUpperCase(),
    references.transferAccountId,
    references.categoryId,
    row.description.trim().toLocaleLowerCase(),
    row.note.trim().toLocaleLowerCase(),
  ]);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function quote(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  row.push(field.replace(/\r$/, ""));
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}
