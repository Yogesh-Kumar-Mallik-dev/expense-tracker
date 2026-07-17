import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  POWERSYNC_URL: z.url().optional(),
  POWERSYNC_PRIVATE_KEY_BASE64: z.string().min(1).optional(),
  POWERSYNC_KEY_ID: z.string().min(1).default("expense-tracker-powersync-1"),
  POWERSYNC_AUDIENCE: z.string().min(1).optional(),
  POWERSYNC_ISSUER: z.string().min(1).optional(),
  ATTACHMENT_BUCKET: z.string().min(1).optional(),
  ATTACHMENT_REGION: z.string().min(1).optional(),
  ATTACHMENT_ENDPOINT: z.url().optional(),
  ATTACHMENT_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
  ATTACHMENT_ACCESS_KEY_ID: z.string().min(1).optional(),
  ATTACHMENT_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  ATTACHMENT_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),
});

export function env() {
  return schema.parse(process.env);
}
