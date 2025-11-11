import { promises as fs } from "fs";
import path from "path";

export interface DemoProof {
  proofId: `0x${string}`;
  programId: number;
  stationId?: string;
  recipient?: string;
  recipientIndex?: number;
  amountNTD?: number;
  metrics?: {
    coveragePermille?: number;
    eventsProcessed?: number;
    cemsValidPermille?: number;
    pm25x10?: number;
  };
}

const DATASET_PATH = path.resolve(__dirname, "../../../config/programs/aqi_demo.json");

async function loadDataset() {
  const raw = await fs.readFile(DATASET_PATH, "utf8");
  return JSON.parse(raw);
}

export async function resolvePhase2Proofs(): Promise<DemoProof[]> {
  const json = await loadDataset();
  if (Array.isArray(json?.proofs)) {
    return json.proofs;
  }
  if (json?.proofId) {
    return [json];
  }
  return [];
}
