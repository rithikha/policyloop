import express from "express";
import multer from "multer";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { fetch } from "undici";
import { VerifyService } from "./verifier";

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  OPEN_DATA_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((value) => value as `0x${string}`),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(8)
});

const env = envSchema.parse(process.env);
const MAX_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;

const app = express();
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES }
});

const verifier = new VerifyService({
  rpcUrl: env.RPC_URL,
  registryAddress: env.OPEN_DATA_REGISTRY_ADDRESS,
  chainId: env.CHAIN_ID
});

const verifyRequestSchema = z.object({
  proofId: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .transform((value) => value as `0x${string}`),
  signature: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/)
    .optional()
    .transform((value) => (value ? (value as `0x${string}`) : undefined)),
  datasetUrl: z.string().url().optional(),
  metadata: z.union([z.record(z.any()), z.string()]).optional()
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.post("/verify", upload.single("dataset"), async (req, res) => {
  try {
    const parsed = verifyRequestSchema.safeParse({
      proofId: req.body.proofId,
      signature: req.body.signature,
      datasetUrl: req.body.datasetUrl,
      metadata: req.body.metadata ?? req.body.metadataJson ?? req.body.metadata_json
    });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }

    const body = parsed.data;

    let metadata: Record<string, unknown> | undefined;
    if (body.metadata) {
      metadata =
        typeof body.metadata === "string"
          ? (JSON.parse(body.metadata) as Record<string, unknown>)
          : (body.metadata as Record<string, unknown>);
    } else if (typeof req.body.metadata === "string") {
      metadata = JSON.parse(req.body.metadata);
    }

    if (!metadata || Array.isArray(metadata)) {
      return res.status(400).json({ error: "Metadata object is required" });
    }

    let datasetBuffer: Buffer | null = null;
    if (req.file) {
      datasetBuffer = req.file.buffer;
    } else if (body.datasetUrl) {
      datasetBuffer = await fetchDatasetBuffer(body.datasetUrl, MAX_BYTES);
    }

    if (!datasetBuffer) {
      return res.status(400).json({ error: "Provide dataset upload or datasetUrl" });
    }

    const result = await verifier.verify({
      proofId: body.proofId,
      dataset: datasetBuffer,
      metadata,
      signature: body.signature
    });

    res.json({
      proofId: result.proofId,
      verified: result.checks.content && result.checks.metadata && result.checks.signature !== false,
      checks: result.checks,
      onChain: result.onChain,
      computed: result.computed,
      reasons: result.reasons
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "Unable to parse metadata JSON" });
    }
    console.error(err);
    res.status(500).json({ error: "Verification failed", message: err instanceof Error ? err.message : String(err) });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.listen(env.PORT, () => {
  console.log(`verify-api listening on http://localhost:${env.PORT}`);
});

async function fetchDatasetBuffer(url: string, maxBytes: number): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > maxBytes) {
    throw new Error("Dataset exceeds MAX_UPLOAD_MB");
  }
  return buffer;
}
