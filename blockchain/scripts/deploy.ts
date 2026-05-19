import hre from "hardhat";

async function main() {
  const network = await hre.network.getOrCreate();
  const { ethers } = network;

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy MockUSD
  const MockUSD = await ethers.getContractFactory("MockUSD");
  const mockUSD = await MockUSD.deploy();
  await mockUSD.waitForDeployment();
  const mockUSDAddress = await mockUSD.getAddress();
  console.log("MockUSD deployed to:", mockUSDAddress);

  // Deploy NGORegistry
  const NGORegistry = await ethers.getContractFactory("NGORegistry");
  const ngoRegistry = await NGORegistry.deploy();
  await ngoRegistry.waitForDeployment();
  const ngoRegistryAddress = await ngoRegistry.getAddress();
  console.log("NGORegistry deployed to:", ngoRegistryAddress);

  // Deploy Donation
  const Donation = await ethers.getContractFactory("Donation");
  const donation = await Donation.deploy(mockUSDAddress, ngoRegistryAddress);
  await donation.waitForDeployment();
  const donationAddress = await donation.getAddress();
  console.log("Donation deployed to:", donationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
