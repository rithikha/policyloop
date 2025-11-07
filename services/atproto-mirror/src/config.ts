import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  OPEN_DATA_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((value) => value as `0x${string}`),
  ATTESTATION_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((value) => value as `0x${string}`),

  ATPROTO_PDS_URL: z.string().url(),
  ATPROTO_HANDLE: z.string().min(1),
  ATPROTO_APP_PASSWORD: z.string().min(1),
  CITYOS_NAMESPACE: z.string().min(1),
  STATION_ALLOWLIST: z.string().optional()
});

export type MirrorConfig = ReturnType<typeof getConfig>;

export function getConfig() {
  const parsed = envSchema.parse(process.env);
  const stationAllowlist = parsed.STATION_ALLOWLIST
    ? parsed.STATION_ALLOWLIST.split(",").map((item) => item.trim()).filter(Boolean)
    : undefined;
  return {
    ...parsed,
    stationAllowlist
  };
}
