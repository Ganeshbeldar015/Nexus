# Nexus Project - Final UGF Setup Guide (Last Day!)

---

## ⚡ 5-Minute Quick Setup

### 1. Get Reown Project ID (for WalletConnect)
- Go to: https://cloud.reown.com/
- Sign up / log in
- Create a new project
- Copy the **Project ID**
- Save it for step 3

### 2. Get Base Sepolia RPC URL
- Get from Alchemy/Infura/QuickNode or use a public one:
  - Public: https://base-sepolia-rpc.publicnode.com

### 3. Setup Environment Variables
```bash
cd frontend
cp .env.example .env.local
```
Edit `frontend/.env.local`:
- Set `VITE_WALLET_CONNECT_PROJECT_ID` = your Reown Project ID
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from Supabase dashboard)
- `VITE_TYI_MOCK_USD_ADDRESS` is already pre-filled (0x27DC...727e)

### 4. Deploy Donation Contract to Base Sepolia
```bash
cd blockchain
# Copy blockchain/.env.example to blockchain/.env and fill in:
# - BASE_SEPOLIA_RPC_URL
# - BASE_SEPOLIA_PRIVATE_KEY (your deployment wallet private key)

# Deploy using Hardhat Ignition:
npx hardhat ignition deploy --network baseSepolia ignition/modules/Nexus.ts

# OR use custom script:
npm run deploy -- --network baseSepolia
```

After deployment, copy the Donation contract address and set it in `frontend/.env.local`:
```
VITE_DONATION_CONTRACT_ADDRESS=0x...YourDeployedDonationAddress...
```

### 5. Start Frontend!
```bash
cd frontend
npm run dev
```

Now you're ready to test UGF donations!

---

## 📝 Where to Get Each Key

| Variable | Where to Get | Notes |
|----------|--------------|-------|
| **VITE_WALLET_CONNECT_PROJECT_ID** | https://cloud.reown.com/ | Create project → copy Project ID |
| **BASE_SEPOLIA_RPC_URL** | Alchemy/Infura/QuickNode or public RPC | Public: https://base-sepolia-rpc.publicnode.com |
| **BASE_SEPOLIA_PRIVATE_KEY** | Your wallet private key | For contract deployment only |
| **VITE_SUPABASE_URL** | Supabase Dashboard → Project Settings → API | |
| **VITE_SUPABASE_ANON_KEY** | Supabase Dashboard → Project Settings → API | |
| **VITE_DONATION_CONTRACT_ADDRESS** | After contract deployment | Copy from Hardhat output |
| **VITE_TYI_MOCK_USD_ADDRESS** | Pre-filled! | 0x27DC...727e from UGF faucet |

---

## 🎯 UGF Integration Paths

### Option 1: React Modal (Simplest - Recommended!)
Use the built-in UGF modal from `@tychilabs/react-ugf` (already set up in App.jsx):
```jsx
import { useUGFModal } from '@tychilabs/react-ugf';

const { openUGF } = useUGFModal();

// When user clicks donate:
openUGF({
  signer: yourEthersSigner,
  tx: {
    to: donationContractAddress,
    data: encodedDonationData,
    value: '0'
  },
  destChainId: '84532' // Base Sepolia
});
```

### Option 2: Programmatic (Full Control)
Use the `donateWithUGF()` function from `frontend/src/lib/ugf.js`:
```jsx
import { donateWithUGF } from '../lib/ugf';

// Call when user clicks donate:
const result = await donateWithUGF({
  signer,
  provider,
  campaignId: 1,
  amount: '10', // 10 TYI_MOCK_USD
  message: 'Great campaign!',
  onProgress: (step, data) => {
    console.log(step, data);
    // Update UI with progress
  }
});

console.log('Donation successful!', result.userTxHash);
```

Both options are already implemented! Use whichever fits your UI!

---

## 🚨 Last Minute Checklist

- [ ] Reown Project ID obtained and added to .env.local
- [ ] Supabase keys added to .env.local
- [ ] Donation contract deployed to Base Sepolia
- [ ] Donation contract address added to .env.local
- [ ] Frontend starts without errors
- [ ] Wallet connects successfully
- [ ] UGF modal or programmatic flow tested

Good luck with your submission! 🎉
