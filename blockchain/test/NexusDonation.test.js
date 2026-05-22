import { expect } from "chai";
import hre from "hardhat";

describe("Nexus Donation System", function () {
  let donation, testToken;
  let owner, ngo, donor;
  let ethers;

  beforeEach(async function () {
    const network = await hre.network.connect();
    ethers = network.ethers;

    [owner, ngo, donor] = await ethers.getSigners();

    // Deploy MockUSD (for local testing only)
    const MockUSD = await ethers.getContractFactory("MockUSD");
    testToken = await MockUSD.deploy();
    await testToken.waitForDeployment();

    // Deploy Donation
    const Donation = await ethers.getContractFactory("Donation");
    donation = await Donation.deploy(await testToken.getAddress());
    await donation.waitForDeployment();

    // Mint some MockUSD to donor and approve Donation contract
    await testToken.mint(donor.address, ethers.parseEther("1000"));
    await testToken.connect(donor).approve(await donation.getAddress(), ethers.parseEther("1000"));

    // Verify NGO
    await donation.verifyNgo(ngo.address, true);
  });

  it("Should only allow verified NGOs to create a campaign", async function () {
    await expect(
      donation.connect(owner).createCampaign(1, "Unauthorized", "Testing access", ethers.parseEther("500"))
    ).to.be.revertedWith("Only verified NGOs can create campaigns");

    await donation.connect(ngo).createCampaign(1, "Authorized", "Testing access", ethers.parseEther("500"));
  });

  it("Should allow verified NGO to create a campaign", async function () {
    await donation.connect(ngo).createCampaign(1, "Flood Relief", "Helping victims", ethers.parseEther("500"));
    const campaign = await donation.getCampaign(1);
    expect(campaign.title).to.equal("Flood Relief");
    expect(campaign.ngo).to.equal(ngo.address);
  });

  it("Should allow donors to donate to a campaign", async function () {
    await donation.connect(ngo).createCampaign(1, "Flood Relief", "Helping victims", ethers.parseEther("500"));

    await donation.connect(donor).donateToCampaign(1, ethers.parseEther("100"), "Stay strong!");
    const campaign = await donation.getCampaign(1);
    expect(campaign.raisedAmount).to.equal(ethers.parseEther("100"));

    const history = await donation.getDonationHistory(1);
    expect(history.length).to.equal(1);
    expect(history[0].message).to.equal("Stay strong!");
  });

  it("Should allow NGO to withdraw funds", async function () {
    await donation.connect(ngo).createCampaign(1, "Flood Relief", "Helping victims", ethers.parseEther("500"));
    await donation.connect(donor).donateToCampaign(1, ethers.parseEther("100"), "Stay strong!");

    const initialNgoBalance = await testToken.balanceOf(ngo.address);
    await donation.connect(ngo).withdrawFunds(1, ethers.parseEther("60"));
    
    expect(await testToken.balanceOf(ngo.address)).to.equal(initialNgoBalance + ethers.parseEther("60"));
    const campaign = await donation.getCampaign(1);
    expect(campaign.withdrawnAmount).to.equal(ethers.parseEther("60"));
  });

  it("Should allow NGO to add usage records", async function () {
    await donation.connect(ngo).createCampaign(1, "Flood Relief", "Helping victims", ethers.parseEther("500"));

    await donation.connect(ngo).addUsageRecord(1, ethers.parseEther("50"), "Bought food", "http://receipt.url");
    const records = await donation.getUsageRecords(1);
    expect(records.length).to.equal(1);
    expect(records[0].description).to.equal("Bought food");
  });

  it("Should allow donors to donate with Permit", async function () {
    await donation.connect(ngo).createCampaign(1, "Permit Test", "Testing permit", ethers.parseEther("500"));

    const amount = ethers.parseEther("50");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const donorAddress = donor.address;
    const donationAddress = await donation.getAddress();

    // Get the current nonce for the donor
    const nonce = await testToken.nonces(donorAddress);
    const domain = {
      name: await testToken.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await testToken.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const value = {
      owner: donorAddress,
      spender: donationAddress,
      value: amount,
      nonce: nonce,
      deadline: deadline,
    };

    const signature = await donor.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    await donation.connect(donor).donateToCampaignWithPermit(
      1,
      amount,
      "Permit donation",
      deadline,
      sig.v,
      sig.r,
      sig.s
    );

    const campaign = await donation.getCampaign(1);
    expect(campaign.raisedAmount).to.equal(amount);
  });
});
