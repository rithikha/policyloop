/* eslint-disable no-console */
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
