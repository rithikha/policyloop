import { ethers } from "hardhat";
import { promises as fs } from "fs";
import path from "path";
import { appendPipelineLog } from "./utils/logger";

const PROGRAM_IDS = {
  IOT: 101,
  VEHICLE: 102,
  FIXED: 103,
  CONSTRUCTION: 104,
};

const PROGRAM_CAPS = {
  [PROGRAM_IDS.IOT]: 3_740_000n,
  [PROGRAM_IDS.VEHICLE]: 19_800_000n,
  [PROGRAM_IDS.FIXED]: 8_036_000n,
  [PROGRAM_IDS.CONSTRUCTION]: 12_300_000n,
};

const MODULE_NAMES: Record<number, string> = {
  [PROGRAM_IDS.IOT]: "ProgramModule_IoT",
  [PROGRAM_IDS.VEHICLE]: "ProgramModule_Vehicle",
  [PROGRAM_IDS.FIXED]: "ProgramModule_Fixed",
  [PROGRAM_IDS.CONSTRUCTION]: "ProgramModule_Construction",
};

const DEPLOY_PATH = path.resolve(__dirname, "../../config/programs/deployments.local.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`[programs] deploying contracts with ${deployer.address}`);

  const FundRegistry = await ethers.getContractFactory("FundRegistry");
  const registry = await FundRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`[programs] FundRegistry -> ${registryAddress}`);

  const moduleConfigs: Array<{ programId: number; args: Array<string | number | bigint>; name: string }> = [
    {
      programId: PROGRAM_IDS.IOT,
      args: [registryAddress, PROGRAM_IDS.IOT, 900, 980, 64_230],
      name: "ProgramModule_IoT",
    },
    {
      programId: PROGRAM_IDS.VEHICLE,
      args: [registryAddress, PROGRAM_IDS.VEHICLE, 500],
      name: "ProgramModule_Vehicle",
    },
    { programId: PROGRAM_IDS.FIXED, args: [registryAddress, PROGRAM_IDS.FIXED, 950], name: "ProgramModule_Fixed" },
    {
      programId: PROGRAM_IDS.CONSTRUCTION,
      args: [registryAddress, PROGRAM_IDS.CONSTRUCTION, 400],
      name: "ProgramModule_Construction",
    },
  ];

  const deployedById: Record<number, { address: string; name: string }> = {};
  for (const config of moduleConfigs) {
    const address = await deployModule(config.name, config.args);
    deployedById[config.programId] = { address, name: config.name };
  }

  for (const [programIdString, moduleAddress] of Object.entries(deployedById)) {
    const programId = Number(programIdString);
    await (await registry.registerProgram(programId, moduleAddress.address, PROGRAM_CAPS[programId])).wait();
    console.log(
      `[programs] registered program ${programId} (module ${moduleAddress.address}) cap=${PROGRAM_CAPS[programId].toString()} NTD`
    );
  }

  const deploymentRecord = {
    registry: registryAddress,
    modules: Object.fromEntries(
      Object.entries(deployedById).map(([id, info]) => [
        id,
        {
          address: info.address,
          name: info.name,
        },
      ])
    ),
  };

  await fs.mkdir(path.dirname(DEPLOY_PATH), { recursive: true });
  await fs.writeFile(DEPLOY_PATH, JSON.stringify(deploymentRecord, null, 2));
  console.log("[programs] deployment addresses saved to", DEPLOY_PATH);

  await appendPipelineLog("programs-deploy", {
    registry: registryAddress,
    modules: deploymentRecord.modules,
  });

  console.log("[programs] deployment complete");
}

async function deployModule(name: string, args: Array<string | number | bigint>) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[programs] ${name} -> ${address}`);
  return address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
