/* eslint-disable no-console */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";

async function main() {
  const [deployer, reviewer1, reviewer2, reviewer3] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const PublisherRegistry = await ethers.getContractFactory("PublisherRegistry");
  const publisherRegistry = await PublisherRegistry.deploy();
  await publisherRegistry.waitForDeployment();

  const OpenDataRegistry = await ethers.getContractFactory("OpenDataRegistry");
  const openDataRegistry = await OpenDataRegistry.deploy(publisherRegistry.target);
  await openDataRegistry.waitForDeployment();

  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy(publisherRegistry.target, openDataRegistry.target);
  await attestationRegistry.waitForDeployment();

  await openDataRegistry.setAttestationRegistry(attestationRegistry.target);

  const PolicyDataView = await ethers.getContractFactory("PolicyDataView");
  const policyDataView = await PolicyDataView.deploy(openDataRegistry.target, attestationRegistry.target);
  await policyDataView.waitForDeployment();

  // Seed default members so the local frontend flows work without extra setup.
  const ROLE_PUBLISHER = Number(await publisherRegistry.ROLE_PUBLISHER());
  const ROLE_REVIEWER = Number(await publisherRegistry.ROLE_REVIEWER());
  const ROLE_AUDITOR = Number(await publisherRegistry.ROLE_AUDITOR());
  const REVIEWER_PUBLIC = 1; // ReviewerKind.PublicSector
  const REVIEWER_NGO = 2; // ReviewerKind.Ngo

  await publisherRegistry.upsertMember(deployer.address, "Ministry of Environment", ROLE_PUBLISHER, 0, true);
  await publisherRegistry.upsertMember(
    reviewer1.address,
    "DEP Taipei City",
    ROLE_REVIEWER | ROLE_AUDITOR,
    REVIEWER_PUBLIC,
    true
  );
  await publisherRegistry.upsertMember(
    reviewer2.address,
    "Green Citizen Alliance",
    ROLE_REVIEWER,
    REVIEWER_NGO,
    true
  );
  await publisherRegistry.upsertMember(
    reviewer3.address,
    "Citizen",
    ROLE_REVIEWER,
    REVIEWER_NGO,
    true
  );

  console.log("\nDeployed contracts:");
  console.log("- PublisherRegistry:", publisherRegistry.target);
  console.log("- OpenDataRegistry:", openDataRegistry.target);
  console.log("- AttestationRegistry:", attestationRegistry.target);
  console.log("- PolicyDataView:", policyDataView.target);

  console.log("\nSeeded members:");
  console.log("- Ministry of Environment (Publisher):", deployer.address);
  console.log("- DEP Taipei City (Reviewer/Auditor):", reviewer1.address);
  console.log("- Green Citizen Alliance (Reviewer):", reviewer2.address);
  console.log("- Citizen (Reviewer):", reviewer3.address);

  await syncEnvFiles({
    publisherRegistry: publisherRegistry.target as string,
    openDataRegistry: openDataRegistry.target as string,
    attestationRegistry: attestationRegistry.target as string,
    policyDataView: policyDataView.target as string
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function syncEnvFiles(addresses: {
  publisherRegistry: string;
  openDataRegistry: string;
  attestationRegistry: string;
  policyDataView: string;
}) {
  const rootDir = path.resolve(__dirname, "..", "..");

  const updates: Array<{ file: string; values: Record<string, string> }> = [
    {
      file: "services/ingest-moev/.env",
      values: {
        OPEN_DATA_REGISTRY_ADDRESS: addresses.openDataRegistry
      }
    },
    {
      file: "services/verify-api/.env",
      values: {
        OPEN_DATA_REGISTRY_ADDRESS: addresses.openDataRegistry
      }
    },
    {
      file: "services/atproto-mirror/.env",
      values: {
        OPEN_DATA_REGISTRY_ADDRESS: addresses.openDataRegistry,
        ATTESTATION_REGISTRY_ADDRESS: addresses.attestationRegistry
      }
    },
    {
      file: "frontend/.env.local",
      values: {
        NEXT_PUBLIC_PUBLISHER_REGISTRY: addresses.publisherRegistry,
        NEXT_PUBLIC_OPEN_DATA_REGISTRY: addresses.openDataRegistry,
        NEXT_PUBLIC_ATTESTATION_REGISTRY: addresses.attestationRegistry,
        NEXT_PUBLIC_POLICY_DATA_VIEW: addresses.policyDataView
      }
    }
  ];

  await Promise.all(
    updates.map(async ({ file, values }) => {
      const filePath = path.join(rootDir, file);
      await updateEnvFile(filePath, values);
      console.log(`[deploy] updated ${file}`);
    })
  );
}

async function updateEnvFile(filePath: string, updates: Record<string, string>) {
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (err) {
    console.warn(`[deploy] skipped ${filePath}: ${err}`);
    return;
  }

  const lines = content.split(/\r?\n/);
  const seen = new Set<string>();
  const updatedLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z0-9_]+)=/);
    if (!match) return line;
    const key = match[1];
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      updatedLines.push(`${key}=${value}`);
    }
  }

  await fs.writeFile(filePath, updatedLines.join("\n"), "utf8");
}
