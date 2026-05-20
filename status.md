# Nexus Project Status

## Overview
This document describes the current state of the Nexus blockchain donation platform project, fully refactored for UGF-native architecture.

## Project Structure
```
Nexus/
├── blockchain/          # Smart contracts & Hardhat setup
│   ├── contracts/       # Solidity contracts
│   │   ├── Donation.sol
│   │   └── TestToken.sol (for local testing only)
│   ├── ignition/        # Deployment modules
│   ├── scripts/         # Helper scripts (deploy, export-abi, send-op-tx)
│   ├── test/            # Test files
│   ├── hardhat.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
├── frontend/            # React + Vite frontend
│   ├── public/          # Static assets
│   ├── src/             # Source code
│   │   ├── components/  # UI components (Button, CampaignCard, Footer, Input, Navbar, Sidebar, UGFDonationTest)
│   │   ├── context/     # React context
│   │   ├── layouts/     # Page layouts
│   │   ├── lib/         # Library integrations (Supabase, Web3, abi/, contracts.js, ugf.js)
│   │   ├── pages/       # Page components
│   │   ├── routes/      # Routing components
│   │   ├── services/    # Services
│   │   └── App.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── UGF_INTEGRATION.md   # UGF integration guide
├── flow.md              # System flow documentation
└── TeamNexus.pdf
```

---

## Blockchain Module

### Contracts (blockchain/contracts/)
- **Donation.sol**: Main donation platform contract
  - Features: Campaign creation, donations, fund withdrawal, usage records
  - Uses OpenZeppelin contracts
  - ERC20 token donation (transferFrom) - NO ETH payable functions
  - **EIP-2612 Permit support** for single-transaction donations
  - Accepts official TYI_MOCK_USD token address in constructor
  - Fully UGF-compatible!
- **TestToken.sol**: ERC20 token for LOCAL TESTING ONLY
  - **EIP-2612 Permit support** for testing permit flows locally
  - Not for production/hackathon use
  - For local development and testing only

### Key Files
- `hardhat.config.ts`: Hardhat configuration
  - Solidity 0.8.28
  - Networks: hardhatMainnet, hardhatOp (Optimism), Sepolia, baseSepolia
- `tsconfig.json`: TypeScript config (Node 22)
- `ignition/modules/Nexus.ts`: Deployment module (deploys Donation only with TYI_MOCK_USD
- `scripts/deploy.ts`: Custom deployment script (uses TYI_MOCK_USD if set, falls back to TestToken)
- `scripts/export-abi.js`: Exports Donation ABI only to frontend
- `.env.example`: Environment variables example

### Dependencies
**Dev Dependencies**:
- @nomicfoundation/hardhat-ethers: ^4.0.11
- @nomicfoundation/hardhat-ignition: ^3.1.5
- @nomicfoundation/hardhat-toolbox-mocha-ethers: ^3.0.5
- @openzeppelin/contracts: ^5.6.1
- ethers: ^6.16.0
- hardhat: ^3.4.5
- typescript: ~5.8.0
- mocha, chai for testing

### Scripts
- `npm run export-abi`: Exports Donation ABI to frontend

---

## Frontend Module

### Tech Stack
- React 19.2.6
- Vite 8.0.12 (build tool)
- Tailwind CSS 3 (styling)
- React Router DOM 7.15.1 (routing)

### Key Directories
- **components/**: Button, CampaignCard, Footer, Input, Navbar, Sidebar, UGFDonationTest
- **pages/**: Landing, Login, Signup, DonorDashboard, NgoDashboard, AdminDashboard, etc.
- **context/**: AuthContext.jsx
- **lib/**: supabase.js, web3.jsx, abi/ (Donation ABI only), contracts.js, ugf.js
- **layouts/**: DashboardLayout, MainLayout
- **routes/**: ProtectedRoute, RoleBasedRoute

### New Files Added
- `frontend/src/lib/contracts.js`: Contract address configuration (TYI_MOCK_USD and Donation)
- `frontend/src/lib/ugf.js`: UGF service layer
- `frontend/src/components/UGFDonationTest.jsx`: Test component for UGF donations

### UGF Service Layer (ugf.js)
Functions included:
- `encodeDonationTransaction()` - Encode donation transaction
- `getContractAddresses()` - Get addresses by chain
- `getDonationQuote()` - Placeholder for UGF quote
- `executeDonationWithUGF()` - Placeholder for UGF execution
- `handleUGFError()` - Error handler

### Dependencies
**Dependencies**:
- @rainbow-me/rainbowkit: ^2.2.11 (wallet connection)
- @supabase/supabase-js: ^2.105.4 (backend)
- @tanstack/react-query: ^5.100.10 (data fetching)
- wagmi: ^3.6.15 (Web3 hooks)
- viem: ^2.49.3 (Ethereum utilities)
- react-hook-form: ^7.76.0 (forms)
- zod: ^4.4.3 (validation)
- framer-motion: ^12.38.0 (animations)
- lucide-react: ^1.16.0 (icons)
- sonner: ^2.0.7 (toasts)
- clsx, tailwind-merge (class utilities)

**Dev Dependencies**:
- vite, @vitejs/plugin-react
- tailwindcss, postcss, autoprefixer
- eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh

### Web3 Config (web3.jsx)
- Chains: mainnet, polygon, optimism, arbitrum, base, sepolia, baseSepolia
- Uses RainbowKit + Wagmi + TanStack Query

---

## UGF Integration
- **Fully UGF-native architecture** using official TYI_MOCK_USD token
- Single-token architecture: User Wallet → TYI_MOCK_USD → UGF settlement (gas) → Donation contract
- No custom token dependency
- Donors **don't need ETH** - UGF handles everything!
- Test component: `UGFDonationTest.jsx` for testing UGF flow
- See UGF_INTEGRATION.md for complete guide
- See flow.md for detailed system flow

---

## Other Files
- UGF_INTEGRATION.md: UGF integration guide
- flow.md: System flow documentation
- TeamNexus.pdf: Project documentation PDF

---

## Deployment Steps
1. Set environment variables in blockchain/.env:
   - BASE_SEPOLIA_RPC_URL
   - BASE_SEPOLIA_PRIVATE_KEY
   - TYI_MOCK_USD_ADDRESS (official TYI token address)
2. Deploy using Ignition: `npx hardhat ignition deploy --network baseSepolia ignition/modules/Nexus.ts
3. Update frontend/src/lib/contracts.js with deployed addresses
