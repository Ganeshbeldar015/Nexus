import hre from "hardhat";

async function main() {
  const network = await hre.network.getOrCreate();
  const { ethers } = network;

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Option 1: Use official TYI_MOCK_USD (recommended for hackathon/UGF)
  // Option 2: Deploy custom MockUSD (for local testing)
  // Deploy Donation
  const Donation = await ethers.getContractFactory("Donation");
  const donation = await Donation.deploy();
  await donation.waitForDeployment();
  const donationAddress = await donation.getAddress();
  console.log("Donation deployed to:", donationAddress);

  console.log("\nDeployment complete!");
  console.log("Donation registry address:", donationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
