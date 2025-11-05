/* eslint-disable no-console */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
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

  console.log("\nDeployed contracts:");
  console.log("- PublisherRegistry:", publisherRegistry.target);
  console.log("- OpenDataRegistry:", openDataRegistry.target);
  console.log("- AttestationRegistry:", attestationRegistry.target);
  console.log("- PolicyDataView:", policyDataView.target);

  console.log("\nPost-deploy actions:");
  console.log("1. Upsert publisher/reviewer/auditor wallets in PublisherRegistry.upsertMember.");
  console.log("2. Fund reviewer wallets and run AttestationRegistry.attest for approvals.");
  console.log("3. Configure frontend/services with deployed addresses.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
