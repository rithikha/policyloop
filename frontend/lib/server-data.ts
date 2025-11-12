import { promises as fs } from "fs";
import path from "path";

export type LedgerEntry = {
  event: "EligibilityIssued" | "PayoutExecuted";
  programId: number;
  proofId: string;
  amountNTD: number;
  ts: string;
  txHash: string;
  toWallet: string;
};

export type LedgerPayload = {
  generatedAt: string;
  programs: Record<string, string>;
  entries: LedgerEntry[];
};

type DemoProof = {
  proofId: `0x${string}`;
  programId: number;
  metrics?: {
    coveragePermille?: number;
    eventsProcessed?: number;
    cemsValidPermille?: number;
    pm25x10?: number;
    uploadLatencyMs?: number;
  };
};

export async function readLedger(): Promise<LedgerPayload | null> {
  const ledgerPath = path.join(process.cwd(), "policy-ledger/ledger.json");
  try {
    const raw = await fs.readFile(ledgerPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function readDemoProofs(): Promise<DemoProof[]> {
  const datasetPath = path.resolve(process.cwd(), "../config/programs/aqi_demo.json");
  try {
    const raw = await fs.readFile(datasetPath, "utf8");
    const json = JSON.parse(raw);
    if (Array.isArray(json?.proofs)) {
      return json.proofs;
    }
    return [];
  } catch {
    return [];
  }
}

export type WeeklyAggregation = {
  generatedAt: string;
  station?: string;
  intervalMinutes?: number;
  intervalsSimulated?: number;
  entries: Array<{
    proofId: string;
    stationId: string;
    coveragePermille: number;
    amountNTD: number;
    recipient?: string;
  }>;
};

export async function readWeeklyAggregation(relativePath?: string): Promise<WeeklyAggregation | null> {
  if (!relativePath) return null;
  const weeklyPath = path.resolve(process.cwd(), "../", relativePath);
  try {
    const raw = await fs.readFile(weeklyPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
