import { expect } from "chai";
import hre from "hardhat";

describe("Nexus Donation System", function () {
  let donation, ngoRegistry, mockUSD;
  let owner, ngo, donor;
  let ethers;

  beforeEach(async function () {
    const network = await hre.network.connect();
    ethers = network.ethers;

    [owner, ngo, donor] = await ethers.getSigners();

    // Deploy MockUSD
    const MockUSD = await ethers.getContractFactory("MockUSD");
    mockUSD = await MockUSD.deploy();
    await mockUSD.waitForDeployment();

    // Deploy NGORegistry
    const NGORegistry = await ethers.getContractFactory("NGORegistry");
    ngoRegistry = await NGORegistry.deploy();
    await ngoRegistry.waitForDeployment();

    // Deploy Donation
    const Donation = await ethers.getContractFactory("Donation");
    donation = await Donation.deploy(await mockUSD.getAddress(), await ngoRegistry.getAddress());
    await donation.waitForDeployment();

    // Mint some MockUSD to donor and approve Donation contract
    await mockUSD.mint(donor.address, ethers.parseEther("1000"));
    await mockUSD.connect(donor).approve(await donation.getAddress(), ethers.parseEther("1000"));
  });

  it("Should register and verify an NGO", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    await ngoRegistry.connect(owner).verifyNGO(ngo.address);
    expect(await ngoRegistry.isVerifiedNGO(ngo.address)).to.equal(true);
  });

  it("Should allow verified NGO to create a campaign", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    await ngoRegistry.connect(owner).verifyNGO(ngo.address);

    await donation.connect(ngo).createCampaign("Flood Relief", "Helping victims", ethers.parseEther("500"));
    const campaign = await donation.getCampaign(1);
    expect(campaign.title).to.equal("Flood Relief");
    expect(campaign.ngo).to.equal(ngo.address);
  });

  it("Should not allow unverified NGO to create a campaign", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    // Not verified
    await expect(donation.connect(ngo).createCampaign("Flood Relief", "Helping victims", ethers.parseEther("500")))
      .to.be.revertedWith("Not a verified NGO");
  });

  it("Should allow donors to donate to a campaign", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    await ngoRegistry.connect(owner).verifyNGO(ngo.address);
    await donation.connect(ngo).createCampaign("Flood Relief", "Helping victims", ethers.parseEther("500"));

    await donation.connect(donor).donateToCampaign(1, ethers.parseEther("100"), "Stay strong!");
    const campaign = await donation.getCampaign(1);
    expect(campaign.raisedAmount).to.equal(ethers.parseEther("100"));

    const history = await donation.getDonationHistory(1);
    expect(history.length).to.equal(1);
    expect(history[0].message).to.equal("Stay strong!");
  });

  it("Should allow NGO to withdraw funds", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    await ngoRegistry.connect(owner).verifyNGO(ngo.address);
    await donation.connect(ngo).createCampaign("Flood Relief", "Helping victims", ethers.parseEther("500"));
    await donation.connect(donor).donateToCampaign(1, ethers.parseEther("100"), "Stay strong!");

    const initialNgoBalance = await mockUSD.balanceOf(ngo.address);
    await donation.connect(ngo).withdrawFunds(1, ethers.parseEther("60"));
    
    expect(await mockUSD.balanceOf(ngo.address)).to.equal(initialNgoBalance + ethers.parseEther("60"));
    const campaign = await donation.getCampaign(1);
    expect(campaign.withdrawnAmount).to.equal(ethers.parseEther("60"));
  });

  it("Should allow NGO to add usage records", async function () {
    await ngoRegistry.connect(ngo).registerNGO("Test NGO", "Description", "website.com");
    await ngoRegistry.connect(owner).verifyNGO(ngo.address);
    await donation.connect(ngo).createCampaign("Flood Relief", "Helping victims", ethers.parseEther("500"));

    await donation.connect(ngo).addUsageRecord(1, ethers.parseEther("50"), "Bought food", "http://receipt.url");
    const records = await donation.getUsageRecords(1);
    expect(records.length).to.equal(1);
    expect(records[0].description).to.equal("Bought food");
  });
});
