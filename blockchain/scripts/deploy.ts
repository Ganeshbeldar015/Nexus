import hre from "hardhat";

async function main() {
  const network = await hre.network.getOrCreate();
  const { ethers } = network;

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Option 1: Use official TYI_MOCK_USD (recommended for hackathon/UGF)
  // Option 2: Deploy custom MockUSD (for local testing)
  let donationTokenAddress;
  let tokenType;

  // Check if TYI_MOCK_USD_ADDRESS is set in environment variables
  // Default: Use official TYI_MOCK_USD from UGF faucet (0x27DC...727e)
  const tyiMockUSDAddress = process.env.TYI_MOCK_USD_ADDRESS || "0x27DC...727e";
  
  if (tyiMockUSDAddress) {
    donationTokenAddress = tyiMockUSDAddress;
    tokenType = "TYI_MOCK_USD";
    console.log("Using TYI_MOCK_USD at:", donationTokenAddress);
  } else {
    // Deploy custom MockUSD for local testing
    const MockUSD = await ethers.getContractFactory("MockUSD");
    const mockUSD = await MockUSD.deploy();
    await mockUSD.waitForDeployment();
    donationTokenAddress = await mockUSD.getAddress();
    tokenType = "Custom MockUSD";
    console.log("Custom MockUSD deployed to:", donationTokenAddress);
  }

  // Deploy Donation
  const Donation = await ethers.getContractFactory("Donation");
  const donation = await Donation.deploy(donationTokenAddress);
  await donation.waitForDeployment();
  const donationAddress = await donation.getAddress();
  console.log("Donation deployed to:", donationAddress);

  console.log("\nDeployment complete!");
  console.log("Token used:", tokenType);
  console.log("Token address:", donationTokenAddress);
  console.log("Donation address:", donationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
