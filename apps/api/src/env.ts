import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  POWERSYNC_URL: z.url().optional(),
  POWERSYNC_TOKEN_SECRET: z.string().min(32).optional(),
});

export function env() {
  return schema.parse(process.env);
}
