const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://base-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(
    '0x71bb85cb0ab8f2de71d4234ea70783c278a3b63a86455ebc10b4df68008b4ebd',
    provider
  );

  const TOKEN = '0x27DC1C167AeF232bb1e21073304B526726a8727e';
  const USER_WALLET = '0xd07c080b58fe87832a4b1216a5a824c0b22f0935';

  const token = new ethers.Contract(TOKEN, [
    'function mint(address to, uint256 amount)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ], wallet);

  const decimals = await token.decimals();
  console.log('Token decimals:', decimals);

  // Check current balance
  const balBefore = await token.balanceOf(USER_WALLET);
  console.log('Current balance:', ethers.formatUnits(balBefore, decimals), 'TYI_MOCK_USD');

  // Mint 1000 tokens
  const mintAmount = ethers.parseUnits('1000', decimals);
  console.log('Minting 1000 TYI_MOCK_USD to', USER_WALLET, '...');
  
  const tx = await token.mint(USER_WALLET, mintAmount);
  console.log('Tx submitted:', tx.hash);
  await tx.wait();

  const balAfter = await token.balanceOf(USER_WALLET);
  console.log('✅ New balance:', ethers.formatUnits(balAfter, decimals), 'TYI_MOCK_USD');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
