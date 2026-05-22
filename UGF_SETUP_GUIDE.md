# UGF Integration - Step-by-Step Guide

## Requirements
1. **Reown Cloud Project ID** (for RainbowKit)
2. **UGF API Key** (from UGF dashboard)
3. **Base Sepolia ETH** (for faucet - to get TYI_MOCK_USD)
4. **TYI_MOCK_USD** (from UGF faucet: 0x27DC...727e)

---

## Step 1: Get Reown Cloud Project ID (for Wallet Connection)

1. Go to [Reown Cloud](https://cloud.reown.com/)
2. Create a new project or use existing
3. Copy your **Project ID**
4. Update `frontend/src/lib/web3.jsx`:
   ```javascript
   const projectId = 'YOUR_REOWN_PROJECT_ID'; // Replace with actual ID
   ```

---

## Step 2: Get UGF API Key

1. Go to [UGF Dashboard](https://ugf.tychilabs.com/)
2. Create an account/login
3. Get your **UGF API Key**
4. Create `frontend/.env.local` file:
   ```env
   VITE_UGF_API_KEY=your_ugf_api_key_here
   VITE_DONATION_CONTRACT_ADDRESS=your_deployed_donation_contract
   VITE_TYI_MOCK_USD_ADDRESS=0x27DC...727e
   ```

---

## Step 3: Get TYI_MOCK_USD from Faucet

1. Go to [UGF Faucet](https://faucet.tychilabs.com/)
2. Connect your wallet
3. Lock Base Sepolia ETH to get TYI_MOCK_USD
4. Now you have TYI_MOCK_USD in your wallet!

---

## Step 4: Install UGF SDK

```bash
cd frontend
npm install @tychilabs/react-ugf
# OR
npm install @tychilabs/ugf-testnet-js
```

---

## Step 5: Deploy Donation Contract (if not done yet)

```bash
cd blockchain
# Set .env variables:
# BASE_SEPOLIA_RPC_URL=your_rpc_url
# BASE_SEPOLIA_PRIVATE_KEY=your_private_key
# TYI_MOCK_USD_ADDRESS=0x27DC...727e

# Deploy using Ignition:
npx hardhat ignition deploy --network baseSepolia ignition/modules/Nexus.ts

# OR use custom script:
npx hardhat run scripts/deploy.ts --network baseSepolia

# Copy Donation contract address and update frontend/.env.local
```

---

## Step 6: Update UGF Service Layer (ugf.js)

Replace placeholder functions with real UGF SDK integration in `frontend/src/lib/ugf.js`.

## Step 7: Test Donation Flow

1. Start frontend: `cd frontend && npm run dev`
2. Connect wallet
3. Use `UGFDonationTest.jsx` component to test UGF donation
4. Verify donation on Base Sepolia explorer

---

## Summary of Required Keys/IDs

| Item | Where to Get | Where to Put |
|------|-------------|--------------|
| Reown Project ID | cloud.reown.com | frontend/src/lib/web3.jsx |
| UGF API Key | ugf.tychilabs.com | frontend/.env.local (VITE_UGF_API_KEY) |
| Donation Contract Address | Deploy to Base Sepolia | frontend/.env.local (VITE_DONATION_CONTRACT_ADDRESS) |
| TYI_MOCK_USD Address | UGF Faucet (0x27DC...727e) | Already set in config files |
