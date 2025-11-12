import { promises as fs } from "fs";
import path from "path";

const STATUS_PATH = path.resolve(process.cwd(), "../artifacts/ingest/status.json");
const LOCAL_PIN_DIR = path.resolve(process.cwd(), "../artifacts/pins");

export type StatusFile = {
  datasetUrl?: string;
  datasetFile?: string;
  datasetUri?: string;
  contentHash?: string;
  startedAt?: string;
  completedAt?: string;
};

export async function readStatus(): Promise<StatusFile | null> {
  try {
    const raw = await fs.readFile(STATUS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadDataset(status: StatusFile) {
  const datasetPath = await resolveDatasetPath(status);
  if (datasetPath) {
    const contents = await fs.readFile(datasetPath, "utf8");
    return { contents, path: datasetPath, source: "local" as const };
  }

  if (status.datasetUri?.startsWith("ipfs://")) {
    const cid = status.datasetUri.replace("ipfs://", "");
    const gateway =
      process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/$/, "") ||
      process.env.IPFS_GATEWAY?.replace(/\/$/, "") ||
      "https://gateway.pinata.cloud/ipfs";
    const url = `${gateway}/${cid}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Unable to fetch dataset from IPFS gateway (${res.status}).`);
    }
    const contents = await res.text();
    return { contents, path: null, source: url };
  }

  if (status.datasetUrl) {
    try {
      const res = await fetch(status.datasetUrl);
      if (res.ok) {
        const contents = await res.text();
        return { contents, path: null, source: status.datasetUrl };
      }
    } catch {
      // ignore refetch errors
    }
  }

  return null;
}

async function resolveDatasetPath(status: StatusFile) {
  if (status.datasetFile) {
    const exists = await fileExists(status.datasetFile);
    if (exists) return status.datasetFile;
  }

  const guesses = new Set<string>();
  if (status.contentHash) {
    const hash = status.contentHash.replace(/^0x/, "");
    guesses.add(`${hash}.json`);
    guesses.add(`${hash}.csv`);
  }
  if (status.datasetUri?.startsWith("ipfs://local/")) {
    const slug = status.datasetUri.replace("ipfs://local/", "");
    guesses.add(`${slug}.json`);
    guesses.add(`${slug}.csv`);
  }

  for (const guess of guesses) {
    const candidate = path.join(LOCAL_PIN_DIR, guess);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function fileExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export function toRelativePath(absolutePath: string) {
  const repoRoot = path.resolve(process.cwd(), "..");
  return path.relative(repoRoot, absolutePath);
}

