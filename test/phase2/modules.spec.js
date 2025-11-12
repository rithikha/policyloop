const { expect } = require("chai");
const { ethers } = require("hardhat");

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

describe("Phase 2 — FundRegistry & Program Modules", function () {
  async function deployFixture() {
    const [deployer, recipient] = await ethers.getSigners();

    const FundRegistry = await ethers.getContractFactory("FundRegistry");
    const registry = await FundRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();

    const IoTModule = await ethers.getContractFactory("ProgramModule_IoT");
    const VehicleModule = await ethers.getContractFactory("ProgramModule_Vehicle");
    const FixedModule = await ethers.getContractFactory("ProgramModule_Fixed");
    const ConstructionModule = await ethers.getContractFactory("ProgramModule_Construction");

    const iot = await IoTModule.deploy(registryAddress, PROGRAM_IDS.IOT, 900, 980, 64_230);
    const vehicle = await VehicleModule.deploy(registryAddress, PROGRAM_IDS.VEHICLE, 500);
    const fixed = await FixedModule.deploy(registryAddress, PROGRAM_IDS.FIXED, 950);
    const construction = await ConstructionModule.deploy(registryAddress, PROGRAM_IDS.CONSTRUCTION, 400);

    await Promise.all([iot.waitForDeployment(), vehicle.waitForDeployment(), fixed.waitForDeployment(), construction.waitForDeployment()]);

    await registry.registerProgram(PROGRAM_IDS.IOT, await iot.getAddress(), PROGRAM_CAPS[PROGRAM_IDS.IOT]);
    await registry.registerProgram(PROGRAM_IDS.VEHICLE, await vehicle.getAddress(), PROGRAM_CAPS[PROGRAM_IDS.VEHICLE]);
    await registry.registerProgram(PROGRAM_IDS.FIXED, await fixed.getAddress(), PROGRAM_CAPS[PROGRAM_IDS.FIXED]);
    await registry.registerProgram(
      PROGRAM_IDS.CONSTRUCTION,
      await construction.getAddress(),
      PROGRAM_CAPS[PROGRAM_IDS.CONSTRUCTION]
    );

    return { registry, iot, vehicle, fixed, construction, recipient, deployer };
  }

  it("registers programs with expected caps", async function () {
    const { registry } = await deployFixture();

    expect(await registry.capOf(PROGRAM_IDS.IOT)).to.equal(PROGRAM_CAPS[PROGRAM_IDS.IOT]);
    expect(await registry.capOf(PROGRAM_IDS.VEHICLE)).to.equal(PROGRAM_CAPS[PROGRAM_IDS.VEHICLE]);
    expect(await registry.capOf(PROGRAM_IDS.FIXED)).to.equal(PROGRAM_CAPS[PROGRAM_IDS.FIXED]);
    expect(await registry.capOf(PROGRAM_IDS.CONSTRUCTION)).to.equal(PROGRAM_CAPS[PROGRAM_IDS.CONSTRUCTION]);
  });

  it("issues eligibility + autopay when module thresholds are satisfied", async function () {
    const { registry, iot, recipient } = await deployFixture();
    const proofId = ethers.id("iot-proof-1");

    const expectedPayout = 64_230n;

    await expect(
      iot.evaluate({
        proofId,
        recipient: await recipient.getAddress(),
        amountNTD: 0n,
        coveragePermille: 920n,
        eventsProcessed: 0n,
        cemsValidPermille: 0n,
        pm25x10: 0n,
      })
    )
      .to.emit(iot, "EligibilityIssued")
      .withArgs(PROGRAM_IDS.IOT, proofId, await recipient.getAddress(), expectedPayout);

    expect(await registry.spentOf(PROGRAM_IDS.IOT)).to.equal(expectedPayout);
  });

  it("reverts when proofs fail thresholds, are reused, or exceed program caps", async function () {
    const { registry, iot, vehicle, recipient } = await deployFixture();
    const badProofId = ethers.id("iot-bad");
    await expect(
      iot.evaluate({
        proofId: badProofId,
        recipient: await recipient.getAddress(),
        amountNTD: 500_000n,
        coveragePermille: 100n,
        eventsProcessed: 0n,
        cemsValidPermille: 0n,
        pm25x10: 0n,
      })
    ).to.be.revertedWithCustomError(iot, "NotEligible");

    const goodProof = {
      proofId: ethers.id("vehicle-1"),
      recipient: await recipient.getAddress(),
      amountNTD: 10_000_000n,
      coveragePermille: 0n,
      eventsProcessed: 700n,
      cemsValidPermille: 0n,
      pm25x10: 0n,
    };

    await (await vehicle.evaluate(goodProof)).wait();
    await expect(vehicle.evaluate(goodProof)).to.be.revertedWithCustomError(vehicle, "ProofAlreadyConsumed");

    await expect(
      vehicle.evaluate({
        ...goodProof,
        proofId: ethers.id("vehicle-2"),
        amountNTD: PROGRAM_CAPS[PROGRAM_IDS.VEHICLE],
      })
    ).to.be.revertedWithCustomError(registry, "CapExceeded");
  });
});
