import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Contract, JsonRpcProvider, Wallet, keccak256, getBytes } from "ethers";
import { fetch } from "undici";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { getConfig } from "./config";
import type { IngestConfig } from "./config";
import { computeDatasetDigest, computeMetadataHash } from "./crypto";
import { openDataRegistryAbi } from "./registry";
import { pinToIpfs } from "./ipfs";

interface MetadataDoc {
  stationId: string;
  capturedAt: number;
  format: string;
  schemaUri: string;
  license: string;
  publisherDid?: string;
  contentHash: `0x${string}`;
  payload: Record<string, unknown>;
}

async function main() {
  const config = getConfig();
  const provider = new JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);
  const signer = new Wallet(config.PUBLISHER_KEY, provider);
  const registry = new Contract(config.OPEN_DATA_REGISTRY_ADDRESS, openDataRegistryAbi, signer);

  const datasetBuffer = await loadDatasetBuffer(config.DATASET_URL, config.DATASET_FILE);
  const datasetJson = parseDataset(datasetBuffer, config.DATASET_FORMAT);

  const metadataDoc = buildMetadataDoc(datasetBuffer, datasetJson, config);
  await validateMetadata(metadataDoc, config.SCHEMA_PATH);

  const contentHash = metadataDoc.contentHash;
  const metadataHash = computeMetadataHash(metadataDoc);
  const datasetUri = await persistDataset(datasetBuffer, contentHash, config);

  const digest = computeDatasetDigest({
    contentHash,
    metadataHash,
    uri: datasetUri,
    version: config.DATASET_VERSION,
    stationId: config.STATION_ID,
    publisher: signer.address as `0x${string}`,
    registry: config.OPEN_DATA_REGISTRY_ADDRESS
  });
  const signature = await signer.signMessage(getBytes(digest));

  console.log("Submitting publish transaction…");
  const tx = await registry.publish(
    contentHash,
    metadataHash,
    datasetUri,
    config.DATASET_VERSION,
    config.STATION_ID,
    signature
  );
  const receipt = await tx.wait();

  const proofId = receipt.logs
    .map((log) => {
      try {
        return registry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .find((parsed) => parsed?.name === "DatasetPublished")?.args?.proofId;

  console.log("Dataset published.");
  console.table({
    proofId: proofId ?? "n/a",
    txHash: receipt.hash,
    uri: datasetUri,
    contentHash,
    metadataHash
  });
}

async function loadDatasetBuffer(url?: string, filePath?: string) {
  if (filePath) {
    return readFile(filePath);
  }
  if (!url) {
    throw new Error("DATASET_URL or DATASET_FILE must be set.");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function parseDataset(buffer: Buffer, format: string): Record<string, unknown> {
  if (format === "csv") {
    return { csv: buffer.toString("utf8") };
  }
  try {
    const parsed = JSON.parse(buffer.toString("utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Dataset JSON must be an object");
  } catch (err) {
    throw new Error(`Failed to parse dataset JSON: ${(err as Error).message}`);
  }
}

function buildMetadataDoc(
  datasetBuffer: Buffer,
  datasetJson: Record<string, unknown>,
  config: IngestConfig
): MetadataDoc {
  const capturedAt =
    config.CAPTURED_AT ??
    (typeof datasetJson.capturedAt === "number" ? datasetJson.capturedAt : undefined) ??
    Math.floor(Date.now() / 1000);

  const contentHash = keccak256(datasetBuffer) as `0x${string}`;

  return {
    stationId: config.STATION_ID,
    capturedAt,
    format: config.DATASET_FORMAT,
    schemaUri: config.SCHEMA_URI,
    license: config.LICENSE,
    publisherDid: config.PUBLISHER_DID || "",
    contentHash,
    payload: datasetJson
  };
}

async function validateMetadata(doc: MetadataDoc, schemaPath: string) {
  const schemaContents = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaContents);
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(doc);
  if (!valid) {
    const errors = (validate.errors ?? []).map((err) => `${err.instancePath || "root"} ${err.message}`);
    throw new Error(`Metadata schema validation failed: ${errors.join(", ")}`);
  }
}

async function persistDataset(buffer: Buffer, hash: `0x${string}`, config: IngestConfig): Promise<string> {
  if (config.DATASET_URI) {
    return config.DATASET_URI;
  }

  const ext = config.DATASET_FORMAT === "csv" ? ".csv" : ".json";
  const fileName = `${hash.slice(2)}${ext}`;

  if (config.IPFS_API_URL) {
    try {
      const result = await pinToIpfs(buffer, fileName, config);
      console.log(`Pinned dataset to ${result.uri}${result.gateway ? ` (${result.gateway})` : ""}`);
      return result.uri;
    } catch (err) {
      console.warn("[ingest] IPFS pin failed, falling back to local pin", err);
    }
  }

  await mkdir(config.PIN_WRITE_DIR, { recursive: true });
  const target = path.join(config.PIN_WRITE_DIR, fileName);
  await writeFile(target, buffer);
  console.log(`Stored dataset locally at ${target}`);
  return `ipfs://local/${hash.slice(2)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
