import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const httpUrl = z
  .string()
  .url()
  .or(z.string().regex(/^https?:\/\//i, "must be http(s) URL"));

const envSchema = z.object({
  RPC_URL: httpUrl,
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  OPEN_DATA_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "invalid address")
    .transform((value) => value as `0x${string}`),
  PUBLISHER_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "invalid private key"),

  DATASET_URL: z.string().url().optional(),
  DATASET_FILE: z.string().optional(),

  STATION_ID: z.string().min(1).default("taipei-city"),
  DATASET_VERSION: z.string().min(1).default("1.0.0"),
  DATASET_FORMAT: z.enum(["json", "csv"]).default("json"),
  SCHEMA_URI: z.string().min(1),
  SCHEMA_PATH: z.string().min(1).default("../../frontend/public/schema/moenv-taipei.json"),
  LICENSE: z.string().min(1).default("CC-BY-4.0"),
  PUBLISHER_DID: z.string().optional(),

  CAPTURED_AT: z.coerce.number().int().optional(),

  DATASET_URI: z.string().optional(),
  PIN_WRITE_DIR: z.string().default("../../artifacts/pins"),

  IPFS_API_URL: z.string().url().optional(),
  IPFS_API_AUTH: z.string().optional(),
  IPFS_GATEWAY: z.string().url().optional()
});

export type IngestConfig = ReturnType<typeof getConfig>;

export function getConfig() {
  const parsed = envSchema.parse(process.env);

  if (!parsed.DATASET_URL && !parsed.DATASET_FILE) {
    throw new Error("Set DATASET_URL or DATASET_FILE so the ingest worker has a source.");
  }

  return {
    ...parsed,
    SCHEMA_PATH: path.resolve(__dirname, parsed.SCHEMA_PATH),
    DATASET_FILE: parsed.DATASET_FILE ? path.resolve(__dirname, parsed.DATASET_FILE) : undefined,
    PIN_WRITE_DIR: path.resolve(__dirname, parsed.PIN_WRITE_DIR)
  };
}
