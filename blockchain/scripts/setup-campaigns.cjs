/**
 * Setup script: Verify deployer as NGO and create campaigns on-chain
 * matching the Supabase database entries.
 *
 * Usage (PowerShell):
 *   $env:BASE_SEPOLIA_RPC_URL='https://sepolia.base.org'
 *   $env:BASE_SEPOLIA_PRIVATE_KEY='0x71bb85cb0ab8f2de71d4234ea70783c278a3b63a86455ebc10b4df68008b4ebd'
 *   node scripts/setup-campaigns.js
 */

const { ethers } = require('ethers');

const DONATION_CONTRACT = '0xB509489E5aC6B21Ff2882F70801dE2764Ac5eCAD';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.BASE_SEPOLIA_PRIVATE_KEY || '0x71bb85cb0ab8f2de71d4234ea70783c278a3b63a86455ebc10b4df68008b4ebd';

// Supabase campaign UUIDs
const CAMPAIGNS = [
  { id: '29239bda-6aac-415e-abb3-b811387766b8', title: 'flood', goal: 5202150 },
  { id: '3b72cde8-b503-4cbf-a2a8-e4f804787ca2', title: 'world war', goal: 1000 },
  { id: 'ec3aa92a-3aa0-4333-b405-f9f6b73d9fda', title: 'world war 2', goal: 1000 },
];

// Minimal Donation ABI for setup
const DONATION_ABI = [
  'function verifyNgo(address _ngo, bool _status) external',
  'function createCampaign(uint256 _campaignId, string _title, string _description, uint256 _targetAmount) external',
  'function campaigns(uint256) view returns (uint256 id, address ngo, string title, string description, uint256 targetAmount, uint256 raisedAmount, uint256 withdrawnAmount, bool active)',
  'function verifiedNgos(address) view returns (bool)',
  'function owner() view returns (address)',
];

function uuidToBigInt(uuid) {
  const hex = uuid.replace(/-/g, '');
  return BigInt('0x' + hex);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const donation = new ethers.Contract(DONATION_CONTRACT, DONATION_ABI, wallet);

  console.log('Deployer/Owner:', wallet.address);

  // 1. Verify deployer as NGO
  const isVerified = await donation.verifiedNgos(wallet.address);
  if (!isVerified) {
    console.log('Verifying deployer as NGO...');
    const tx = await donation.verifyNgo(wallet.address, true);
    await tx.wait();
    console.log('✅ Deployer verified as NGO');
  } else {
    console.log('✅ Deployer already verified as NGO');
  }

  // 2. Create campaigns
  for (const c of CAMPAIGNS) {
    const campaignId = uuidToBigInt(c.id);
    const existing = await donation.campaigns(campaignId);
    
    if (existing.id !== 0n) {
      console.log(`✅ Campaign "${c.title}" (${c.id}) already exists on-chain`);
      continue;
    }

    console.log(`Creating campaign "${c.title}" (${c.id})...`);
    console.log(`  On-chain ID: ${campaignId}`);
    const targetWei = ethers.parseEther(String(c.goal));
    
    const tx = await donation.createCampaign(
      campaignId,
      c.title,
      `Campaign: ${c.title}`,
      targetWei
    );
    await tx.wait();
    console.log(`✅ Campaign "${c.title}" created on-chain`);
  }

  console.log('\n🎉 All campaigns set up!');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
