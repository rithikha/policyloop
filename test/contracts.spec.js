const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const Timeliness = {
  Unknown: 0,
  OnTime: 1,
  SlightDelay: 2,
  Late: 3,
};

const ProofStatus = {
  None: 0,
  Submitted: 1,
  Attested: 2,
  Revoked: 3,
};

const TrustTier = {
  None: 0,
  Submitted: 1,
  Attested: 2,
  EligibleForPolicy: 3,
  Audited: 4,
  Revoked: 5,
};

async function publishDataset(openDataRegistry, publisher, contentHash, metadataHash, uri, version, stationId, signature) {
  const publishFn = openDataRegistry.connect(publisher).publish;
  const txPromise = publishFn(contentHash, metadataHash, uri, version, stationId, signature);
  await expect(txPromise)
    .to.emit(openDataRegistry, "DatasetPublished")
    .withArgs(anyValue, publisher.address, stationId, anyValue);
  const tx = await txPromise;
  const receipt = await tx.wait();

  for (const log of receipt.logs) {
    if (log.address !== openDataRegistry.target) continue;
    try {
      const parsed = openDataRegistry.interface.parseLog(log);
      if (parsed && parsed.name === "DatasetPublished") {
        return parsed.args.proofId ?? parsed.args[0];
      }
    } catch {
      // ignore non-matching logs
    }
  }

  throw new Error("DatasetPublished event not found");
}

async function signDataset(openDataRegistry, publisher, contentHash, metadataHash, uri, version, stationId) {
  const digest = await openDataRegistry.datasetDigest(
    contentHash,
    metadataHash,
    uri,
    version,
    stationId,
    publisher.address
  );
  const message = ethers.getBytes(digest);
  const signature = await publisher.signMessage(message);
  const recovered = ethers.verifyMessage(message, signature);
  expect(recovered).to.equal(publisher.address);
  return { digest, signature };
}

describe("Registry workflow", () => {
  async function deployFixture() {
    const [deployer, publisher, reviewer1, reviewer2, reviewer3] = await ethers.getSigners();

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

    const publisherRole = Number(await publisherRegistry.ROLE_PUBLISHER());
    const reviewerRole = Number(await publisherRegistry.ROLE_REVIEWER());
    const auditorRole = Number(await publisherRegistry.ROLE_AUDITOR());

    await publisherRegistry.upsertMember(
      publisher.address,
      "Ministry of Environment",
      publisherRole,
      0,
      true
    );
    await publisherRegistry.upsertMember(
      reviewer1.address,
      "DEP Taipei City",
      reviewerRole | auditorRole,
      1,
      true
    );
    await publisherRegistry.upsertMember(
      reviewer2.address,
      "Green Citizen Alliance",
      reviewerRole,
      2,
      true
    );
    await publisherRegistry.upsertMember(
      reviewer3.address,
      "Citizen",
      reviewerRole,
      2,
      true
    );

    return {
      deployer,
      publisher,
      reviewer1,
      reviewer2,
      reviewer3,
      publisherRegistry,
      openDataRegistry,
      attestationRegistry,
      policyDataView,
    };
  }

  it("allows allowlisted publisher to publish datasets", async () => {
    const { publisher, openDataRegistry } = await loadFixture(deployFixture);

    const contentHash = ethers.id("dataset-content");
    const metadataHash = ethers.id("dataset-metadata");
    const uri = "ipfs://cid";
    const version = "1.0.0";
    const stationId = "taipei-main";

    const { signature } = await signDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId
    );

    const proofId = await publishDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId,
      signature
    );

    const proof = await openDataRegistry.getProof(proofId);
    expect(proof[0]).to.equal(contentHash);
    expect(proof[1]).to.equal(metadataHash);
    expect(proof[2]).to.equal(publisher.address);
    expect(proof[7]).to.equal(ProofStatus.Submitted);

    const latest = await openDataRegistry.getLatestProof(stationId);
    expect(latest).to.equal(proofId);
  });

  it("prevents unauthorised publish", async () => {
    const { reviewer1, openDataRegistry } = await loadFixture(deployFixture);
    const contentHash = ethers.id("dataset-content");
    const metadataHash = ethers.id("dataset-metadata");
    const uri = "ipfs://cid";
    const version = "1.0.0";
    const stationId = "taipei-main";
    const { signature } = await signDataset(
      openDataRegistry,
      reviewer1,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId
    );

    await expect(
      openDataRegistry.connect(reviewer1).publish(contentHash, metadataHash, uri, version, stationId, signature)
    ).to.be.revertedWith("OpenDataRegistry: not publisher");
  });

  it("collects attestations and updates trust state", async () => {
    const { publisher, reviewer1, reviewer3, openDataRegistry, attestationRegistry, policyDataView } = await loadFixture(
      deployFixture
    );

    const contentHash = ethers.id("dataset-content");
    const metadataHash = ethers.id("dataset-metadata");
    const uri = "ipfs://cid";
    const version = "1.0.0";
    const stationId = "taipei-main";
    const { signature } = await signDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId
    );

    const proofId = await publishDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId,
      signature
    );

    await expect(
      attestationRegistry.connect(reviewer1).attest(proofId, "Looks good", Timeliness.OnTime, true)
    ).to.emit(attestationRegistry, "Attested");

    await expect(
      attestationRegistry.connect(reviewer3).attest(proofId, "NGO signed", Timeliness.OnTime, false)
    ).to.emit(attestationRegistry, "Attested");

    const status = await openDataRegistry.statusOf(proofId);
    expect(status).to.equal(ProofStatus.Attested);

    const latestAttested = await openDataRegistry.getLatestAttestedProof(stationId);
    expect(latestAttested).to.equal(proofId);

    const summary = await attestationRegistry.getSummary(proofId);
    expect(summary.total).to.equal(2);
    expect(summary.publicCount).to.equal(1);
    expect(summary.ngoCount).to.equal(1);
    expect(summary.audited).to.equal(true);
    expect(summary.timeliness).to.equal(Timeliness.OnTime);

    const score = await policyDataView.trustScore(proofId);
    expect(score).to.equal(95);

    const tier = await policyDataView.trustTier(proofId);
    expect(tier).to.equal(TrustTier.Audited);
  });

  it("enforces one attestation per reviewer and reviewer role checks", async () => {
    const { publisher, reviewer1, reviewer2, reviewer3, openDataRegistry, attestationRegistry } = await loadFixture(
      deployFixture
    );

    const contentHash = ethers.id("dataset-content");
    const metadataHash = ethers.id("dataset-metadata");
    const uri = "ipfs://cid";
    const version = "1.0.0";
    const stationId = "taipei-main";
    const { signature } = await signDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId
    );

    const proofId = await publishDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId,
      signature
    );

    await attestationRegistry.connect(reviewer1).attest(proofId, "First reviewer", Timeliness.OnTime, false);

    await expect(
      attestationRegistry.connect(reviewer1).attest(proofId, "Double", Timeliness.OnTime, false)
    ).to.be.revertedWith("AttestationRegistry: already attested");

    await attestationRegistry.connect(reviewer2).attest(proofId, "Second reviewer", Timeliness.SlightDelay, false);

    await expect(
      attestationRegistry.connect(reviewer3).attest(proofId, "Third reviewer", Timeliness.SlightDelay, false)
    ).to.emit(attestationRegistry, "Attested");

    const summary = await attestationRegistry.getSummary(proofId);
    expect(summary.total).to.equal(3);
    expect(summary.publicCount).to.equal(1);
    expect(summary.ngoCount).to.equal(2);
  });

  it("supports auditor-led revocation with public reason", async () => {
    const { publisher, reviewer1, openDataRegistry, attestationRegistry, policyDataView } = await loadFixture(
      deployFixture
    );

    const contentHash = ethers.id("dataset-content");
    const metadataHash = ethers.id("dataset-metadata");
    const uri = "ipfs://cid";
    const version = "1.0.0";
    const stationId = "taipei-main";
    const { signature } = await signDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId
    );

    const proofId = await publishDataset(
      openDataRegistry,
      publisher,
      contentHash,
      metadataHash,
      uri,
      version,
      stationId,
      signature
    );

    await expect(openDataRegistry.connect(reviewer1).revoke(proofId, "Incorrect readings"))
      .to.emit(openDataRegistry, "Revoked")
      .withArgs(proofId, reviewer1.address, "Incorrect readings", anyValue);

    const status = await openDataRegistry.statusOf(proofId);
    expect(status).to.equal(ProofStatus.Revoked);

    const revocation = await openDataRegistry.revocation(proofId);
    expect(revocation.auditor).to.equal(reviewer1.address);
    expect(revocation.reason).to.equal("Incorrect readings");
    expect(revocation.revokedAt).to.be.gt(0);

    const tier = await policyDataView.trustTier(proofId);
    expect(tier).to.equal(TrustTier.Revoked);

    const latestAttested = await openDataRegistry.getLatestAttestedProof(stationId);
    expect(latestAttested).to.equal(ethers.ZeroHash);

    await expect(
      attestationRegistry.connect(reviewer1).attest(proofId, "Attempt after revoke", Timeliness.OnTime, false)
    ).to.be.revertedWith("AttestationRegistry: proof revoked");
  });
});
