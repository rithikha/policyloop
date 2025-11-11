import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";
import { parseDataset, ParsedEvaluation } from "./parse-dataset";
import { appendPipelineLog } from "../utils/logger";

const PROGRAM_MODULES: Record<number, string> = {
  101: "ProgramModule_IoT",
  102: "ProgramModule_Vehicle",
  103: "ProgramModule_Fixed",
  104: "ProgramModule_Construction",
};

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

const DEPLOY_PATH = path.resolve(__dirname, "../../../config/programs/deployments.local.json");

async function loadDeployments(): Promise<DeploymentInfo> {
  try {
    const raw = await fs.readFile(DEPLOY_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Unable to load deployment file at ${DEPLOY_PATH}. Run programs deploy script first. ${(error as Error).message}`
    );
  }
}

function pickRecipient(entry: ParsedEvaluation, fallback: string[]): string {
  if (entry.recipient) return entry.recipient;
  if (entry.recipientIndex != null && fallback[entry.recipientIndex]) return fallback[entry.recipientIndex];
  return fallback[entry.programId % fallback.length];
}

async function main() {
  const deployments = await loadDeployments();
  const entries = await parseDataset();
  if (entries.length === 0) {
    console.log("[programs] no proofs found in dataset; nothing to evaluate.");
    return;
  }

  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error("Need at least two local accounts to route payouts.");
  }
  const fallbackRecipients = signers.slice(1).map((s) => s.address);

  let attempted = 0;
  let successes = 0;
  let skipped = 0;

  for (const entry of entries) {
    const moduleInfo = deployments.modules?.[entry.programId] ?? deployments.modules?.[String(entry.programId)];
    const moduleName = moduleInfo?.name ?? PROGRAM_MODULES[entry.programId];
    if (!moduleInfo?.address || !moduleName) {
      console.warn(`[programs] skipping program ${entry.programId}; module not found in deployment data.`);
      continue;
    }

    const recipient = pickRecipient(entry, fallbackRecipients);
    const moduleContract = await ethers.getContractAt(moduleName, moduleInfo.address);
    try {
      attempted += 1;
      console.log(`[programs] Evaluating program ${entry.programId} for proof ${entry.proofId} -> ${recipient}`);
      const tx = await moduleContract.evaluate({
        proofId: entry.proofId,
        recipient,
        amountNTD: BigInt(entry.amountNTD),
        coveragePermille: entry.coveragePermille,
        eventsProcessed: entry.eventsProcessed,
        cemsValidPermille: entry.cemsValidPermille,
        pm25x10: entry.pm25x10,
      });
      await tx.wait();
      console.log(`[programs]   ✔ tx ${tx.hash}`);
      successes += 1;
    } catch (error) {
      const message = (error as Error).message || "";
      if (message.includes("ProofAlreadyConsumed")) {
        console.log(`[programs]   skipped (proof already consumed)`);
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  await appendPipelineLog("programs-evaluate", {
    attempted,
    successes,
    skipped,
  });
}

main().catch((error) => {
  console.error("[programs] metrics evaluate-all failed:", error);
  process.exitCode = 1;
});
