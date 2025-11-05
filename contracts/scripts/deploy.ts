/* eslint-disable no-console */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  console.log("\nNext steps:");
  console.log("- Implement contracts & constructors");
  console.log("- Wire Sepolia RPC and private key in .env (SEPOLIA_RPC_URL, DEPLOYER_KEY)");
  console.log("- Run: pnpm hardhat run scripts/deploy.ts --network sepolia");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
