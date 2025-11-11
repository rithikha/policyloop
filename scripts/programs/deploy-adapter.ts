import { ethers } from "hardhat";
import path from "path";
import { promises as fs } from "fs";

async function loadPhase1Addresses() {
  const configPath = path.resolve(__dirname, "../../config/programs/phase1.addresses.json");
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const json = JSON.parse(raw);
    if (!json.openDataRegistry) throw new Error("openDataRegistry missing in phase1.addresses.json");
    return json;
  } catch (error) {
    throw new Error(`Failed to read phase1.addresses.json (${(error as Error).message}). Run phase1-detect first.`);
  }
}

async function main() {
  const phase1 = await loadPhase1Addresses();
  const [deployer] = await ethers.getSigners();
  console.log(`[programs] deploying adapter with ${deployer.address}`);

  const Adapter = await ethers.getContractFactory("PolicyDataViewAdapter");
  const adapter = await Adapter.deploy(phase1.openDataRegistry);
  await adapter.waitForDeployment();
  const address = await adapter.getAddress();

  console.log("[programs] PolicyDataViewAdapter ->", address);
  console.log("[programs] wired to Phase-1 ODR ->", phase1.openDataRegistry);
}

main().catch((error) => {
  console.error("[programs] deploy-adapter failed:", error);
  process.exitCode = 1;
});
