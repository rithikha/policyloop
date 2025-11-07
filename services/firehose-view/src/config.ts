import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4100),
  ATPROTO_PDS_URL: z.string().url(),
  ATPROTO_HANDLE: z.string().min(1),
  ATPROTO_APP_PASSWORD: z.string().min(1),
  CITYOS_NAMESPACE: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(20000),
  FEED_LIMIT: z.coerce.number().int().positive().max(100).default(25)
});

export type ViewConfig = ReturnType<typeof getConfig>;

export function getConfig() {
  return envSchema.parse(process.env);
}
