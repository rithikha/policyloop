import { promises as fs } from "fs";
import path from "path";
import { appendPipelineLog } from "./utils/logger";

const OUTPUT_PATH = path.join(__dirname, "../../config/programs/phase1.addresses.json");
const FALLBACK_ADDRESSES = {
  publisherRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  openDataRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  attestationRegistry: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  policyDataView: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
};

async function readJson(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function detectFromPhase1Config() {
  const configPath = path.join(__dirname, "../../config/phase1.addresses.json");
  const json = await readJson(configPath);
  if (!json) return null;
  const { publisherRegistry, openDataRegistry, attestationRegistry, policyDataView } = json;
  if (openDataRegistry) {
    return {
      publisherRegistry,
      openDataRegistry,
      attestationRegistry,
      policyDataView,
    };
  }
  return null;
}

async function detectFromDeployments() {
  const deploymentsDir = path.join(__dirname, "../../deployments");
  try {
    const files = await fs.readdir(deploymentsDir);
    for (const file of files) {
      const ext = path.extname(file);
      if (ext !== ".json") continue;
      const json = await readJson(path.join(deploymentsDir, file));
      if (!json?.contracts) continue;
      const openDataRegistry = json.contracts.OpenDataRegistry?.address;
      if (openDataRegistry) {
        return {
          publisherRegistry: json.contracts.PublisherRegistry?.address ?? null,
          openDataRegistry,
          attestationRegistry: json.contracts.AttestationRegistry?.address ?? null,
          policyDataView: json.contracts.PolicyDataView?.address ?? null,
        };
      }
    }
  } catch {
    // ignore when directory missing
  }
  return null;
}

async function main() {
  let detected =
    (await detectFromPhase1Config()) ??
    (await detectFromDeployments()) ?? {
      ...FALLBACK_ADDRESSES,
    };

  detected = {
    ...FALLBACK_ADDRESSES,
    ...detected,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        ...detected,
        detectedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log("[programs] Phase-1 addresses written ->", OUTPUT_PATH);
  console.table(detected);
  await appendPipelineLog("phase1-detect", {
    openDataRegistry: detected.openDataRegistry,
    policyDataView: detected.policyDataView,
  });
}

main().catch((error) => {
  console.error("[programs] phase1-detect failed:", error);
  process.exitCode = 1;
});
