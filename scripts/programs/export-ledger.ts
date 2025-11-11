import { ethers } from "hardhat";
import { promises as fs } from "fs";
import path from "path";
import { appendPipelineLog } from "./utils/logger";

const PROGRAM_LABELS: Record<number, string> = {
  101: "IoT Coverage Boost",
  102: "EV Retrofit Incentive",
  103: "Fixed-Site CEMS Upgrade",
  104: "Construction Dust Control",
};

const PROGRAM_CAPS: Record<number, bigint> = {
  101: 3_740_000n,
  102: 19_800_000n,
  103: 8_036_000n,
  104: 12_300_000n,
};

const DEPLOY_PATH = path.resolve(__dirname, "../../config/programs/deployments.local.json");
const LEDGER_JSON = path.resolve(__dirname, "../../frontend/policy-ledger/ledger.json");

interface DeploymentInfo {
  registry: string;
  modules: Record<
    string,
    {
      address: string;
      name: string;
    }
  >;
}

interface LedgerEntry {
  event: "EligibilityIssued" | "PayoutExecuted";
  programId: number;
  proofId: string;
  amountNTD: number;
  ts: string;
  txHash: string;
  toWallet: string;
}

async function loadDeployments(): Promise<DeploymentInfo> {
  const raw = await fs.readFile(DEPLOY_PATH, "utf8");
  return JSON.parse(raw);
}

async function eventTimestamp(blockNumber: number) {
  const block = await ethers.provider.getBlock(blockNumber);
  return block ? new Date(block.timestamp * 1000).toISOString() : new Date().toISOString();
}

async function collectEntries(deployments: DeploymentInfo): Promise<LedgerEntry[]> {
  const entries: LedgerEntry[] = [];

  await Promise.all(
    Object.entries(deployments.modules).map(async ([programIdString, info]) => {
      const programId = Number(programIdString);
      const moduleContract = await ethers.getContractAt(info.name, info.address);
      const eligibilityLogs = await moduleContract.queryFilter(moduleContract.filters.EligibilityIssued());
      const payoutLogs = await moduleContract.queryFilter(moduleContract.filters.PayoutExecuted());

      for (const log of eligibilityLogs) {
        const ts = await eventTimestamp(log.blockNumber);
        entries.push({
          event: "EligibilityIssued",
          programId,
          proofId: log.args?.proofId ?? "",
          amountNTD: Number(log.args?.amountNTD ?? 0n),
          ts,
          txHash: log.transactionHash,
          toWallet: log.args?.recipient ?? "",
        });
      }
      for (const log of payoutLogs) {
        const ts = await eventTimestamp(log.blockNumber);
        entries.push({
          event: "PayoutExecuted",
          programId,
          proofId: log.args?.proofId ?? "",
          amountNTD: Number(log.args?.amountNTD ?? 0n),
          ts,
          txHash: log.transactionHash,
          toWallet: log.args?.recipient ?? "",
        });
      }
    })
  );

  return entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

function verifyCaps(entries: LedgerEntry[]) {
  const totals: Record<number, number> = {};
  entries
    .filter((entry) => entry.event === "PayoutExecuted")
    .forEach((entry) => {
      totals[entry.programId] = (totals[entry.programId] ?? 0) + entry.amountNTD;
    });
  for (const [programIdString, total] of Object.entries(totals)) {
    const programId = Number(programIdString);
    const cap = Number(PROGRAM_CAPS[programId] ?? 0n);
    if (cap && total > cap) {
      throw new Error(`Program ${programId} exceeded cap (${total} > ${cap})`);
    }
  }
}

async function main() {
  const deployments = await loadDeployments();
  const entries = await collectEntries(deployments);
  if (entries.length === 0) {
    throw new Error("No program events found. Run evaluate-all before exporting the ledger.");
  }
  verifyCaps(entries);

  const payload = {
    generatedAt: new Date().toISOString(),
    programs: PROGRAM_LABELS,
    entries,
  };

  await fs.mkdir(path.dirname(LEDGER_JSON), { recursive: true });
  await fs.writeFile(LEDGER_JSON, JSON.stringify(payload, null, 2));

  const eligCount = entries.filter((entry) => entry.event === "EligibilityIssued").length;
  const payoutCount = entries.filter((entry) => entry.event === "PayoutExecuted").length;
  await appendPipelineLog("programs-export", {
    registry: deployments.registry,
    elig: eligCount,
    payout: payoutCount,
  });

  console.log(`[programs] wrote ledger with ${entries.length} entries -> ${LEDGER_JSON}`);
  console.log(`[programs] summary: ${eligCount} eligibilities · ${payoutCount} payouts`);
}

main().catch((error) => {
  console.error("[programs] export-ledger failed:", error);
  process.exitCode = 1;
});
