# UGF + TYI MockUSD Project Audit Report (Wallet + UGF Flow)

---

## 1. Project Architecture Overview

```json
{
  "frontend": "React 19.2.6 + Vite 8.0.12 + Tailwind CSS 3",
  "backend": "Supabase backend (Auth only, no Edge Functions needed for wallet flow)",
  "supabase_used": true,
  "auth_method": "Supabase Auth (via AuthContext.jsx)",
  "api_layer_location": "frontend/src/lib/supabase.js (only Supabase client)",
  "env_files": ["frontend/.env (not present, but .env.example template exists)"],
  "deployment": "Hardhat deployment for blockchain contracts; Vite for frontend",
  "architecture": "Wallet + UGF (frontend wallet connection with UGF for gasless transactions)"
}
```

---

## 2. Wallet Integration Detection

```json
[
  {
    "file": "frontend/src/lib/web3.jsx",
    "purpose": "Wallet connect setup with RainbowKit + Wagmi",
    "keep": true
  },
  {
    "file": "frontend/src/App.jsx",
    "purpose": "Wraps app with Web3Provider and UGFProvider",
    "keep": true
  },
  {
    "file": "frontend/src/components/UGFDonationTest.jsx",
    "purpose": "Test component for UGF wallet flow",
    "keep": true
  },
  {
    "file": "frontend/src/lib/contracts.js",
    "purpose": "Contract addresses (includes tyiMockUSD)",
    "keep": true
  },
  {
    "file": "frontend/src/lib/ugf.js",
    "purpose": "UGF service layer",
    "keep": true
  }
]
```

**Note**: All wallet integration should be kept for wallet + UGF flow!

---

## 3. Payment / Blockchain Logic Detection

| File Path | Purpose | Dependency Chain |
|-----------|---------|-----------------|
| blockchain/contracts/Donation.sol | Main donation contract | OpenZeppelin IERC20, IERC20Permit, Ownable |
| blockchain/contracts/MockUSD.sol | Mock ERC20 token (local test only) | OpenZeppelin ERC20, ERC20Permit |
| frontend/src/lib/ugf.js | UGF service layer (placeholder) | @tychilabs/react-ugf, @tychilabs/ugf-testnet-js |
| frontend/src/lib/abi/Donation.json | Donation contract ABI | — |
| frontend/src/lib/abi/MockUSD.json | MockUSD contract ABI | — |
| frontend/src/lib/contracts.js | Contract address config | — |

---

## 4. Supabase Backend Capability Check

```json
{
  "edge_functions_ready": false,
  "existing_functions": [],
  "backend_api_exists": false,
  "recommended_location_for_ugf": "Frontend SDK (wallet + UGF flow - no Edge Functions needed!)"
}
```

**Note**: For wallet + UGF flow, we don't need Edge Functions - we use the UGF SDK directly in the frontend!

---

## 5. Environment Variables Audit

```json
[
  {
    "name": "VITE_SUPABASE_URL",
    "used_in": ["frontend/src/lib/supabase.js"],
    "frontend_exposed": true
  },
  {
    "name": "VITE_SUPABASE_ANON_KEY",
    "used_in": ["frontend/src/lib/supabase.js"],
    "frontend_exposed": true
  },
  {
    "name": "VITE_WALLET_CONNECT_PROJECT_ID",
    "used_in": ["frontend/src/lib/web3.jsx"],
    "frontend_exposed": true
  }
]
```

### Missing Env Vars Needed:
- `VITE_UGF_API_KEY` (for UGF SDK)
- `VITE_TYI_MOCK_USD_ADDRESS` (already partially set)
- `VITE_DONATION_CONTRACT_ADDRESS` (after deployment)

---

## 6. API Integration Readiness

### Current API Calling Patterns:
- Only `supabase.js` exists (Supabase client)
- UGF SDK installed: `@tychilabs/react-ugf`, `@tychilabs/ugf-testnet-js`

### Best Location for UGF API Integration:
- Use `@tychilabs/react-ugf` directly in frontend (already installed!)
- Update `frontend/src/lib/ugf.js` with real UGF SDK integration

---

## 7. Database Schema Audit

### Relevant Tables (Current - Not Verified):
No database schema files found in repo (schema likely in Supabase dashboard)

### Recommended Payment Schema for UGF:
```json
{
  "table": "payments",
  "columns": [
    "id (uuid)",
    "user_id (uuid, references auth.users)",
    "campaign_id (bigint)",
    "amount (numeric)",
    "tyi_mock_usd_amount (numeric)",
    "ugf_transaction_id (text)",
    "status (text: pending/confirmed/failed)",
    "transaction_hash (text)",
    "created_at (timestamp)",
    "updated_at (timestamp)"
  ]
}
```

---

## 8. Authentication & Authorization

- **Supabase Auth**: Yes (via AuthContext.jsx)
- **JWT usage**: Implicit via Supabase
- **Session handling**: Yes (AuthContext.jsx)
- **Protected routes**: Yes (ProtectedRoute.jsx, RoleBasedRoute.jsx)
- **Roles**: Yes (donor, ngo, admin)

---

## 9. Frontend Payment Entry Points

### Component Paths:
1. `frontend/src/pages/CampaignDetails.jsx` - Campaign details (likely donation button here)
2. `frontend/src/pages/DonorDashboard.jsx` - Donor dashboard
3. `frontend/src/components/UGFDonationTest.jsx` - UGF test component (keep!)

---

## 10. Dependency Audit

```bash
# Frontend Dependencies
- @supabase/supabase-js: ^2.105.4 (keep)
- @rainbow-me/rainbowkit: ^2.2.11 (keep!)
- wagmi: ^3.6.15 (keep!)
- viem: ^2.49.3 (keep!)
- ethers: ^6.16.0 (keep)
- @tychilabs/react-ugf: ^2.0.0 (keep/implement)
- @tychilabs/ugf-testnet-js: ^0.1.3 (keep)
```

### Recommendations:
- **Keep all wallet dependencies**: `@rainbow-me/rainbowkit`, `wagmi`, `viem`
- **Implement real UGF SDK integration** in `ugf.js`

---

## 11. Integration Gaps

```json
[
  "UGF SDK integration is placeholder only - need real implementation",
  "No payment database tables defined",
  "Missing VITE_UGF_API_KEY environment variable",
  "Donation contract needs to be deployed to Base Sepolia"
]
```

---

## 12. Implementation Plan

### Step 1: Complete UGF SDK Integration
- Update `frontend/src/lib/ugf.js` with real UGF SDK code
- Use `@tychilabs/react-ugf` for easier integration

### Step 2: Deploy Donation Contract
- Deploy Donation.sol to Base Sepolia with TYI_MOCK_USD address (0x27DC...727e)
- Update `frontend/src/lib/contracts.js` with deployed Donation address

### Step 3: Set Environment Variables
- Create `frontend/.env.local` with:
  - `VITE_UGF_API_KEY`
  - `VITE_DONATION_CONTRACT_ADDRESS`
  - `VITE_TYI_MOCK_USD_ADDRESS` (0x27DC...727e)
  - `VITE_WALLET_CONNECT_PROJECT_ID` (from Reown Cloud)

### Step 4: Test UGF Donation Flow
- Use `UGFDonationTest.jsx` component
- Verify gasless donation works

---

## 13. Final Deliverables

```json
{
  "wallet_code_keep": [
    "frontend/src/lib/web3.jsx",
    "frontend/src/App.jsx",
    "frontend/src/components/UGFDonationTest.jsx"
  ],
  "files_to_update": [
    "frontend/src/lib/ugf.js (implement real UGF SDK)",
    "frontend/src/lib/contracts.js (add deployed addresses)",
    "frontend/.env.local (create and add env vars)"
  ],
  "db_changes": [
    "Create payments table (optional for MVP)"
  ],
  "env_vars_needed": [
    "VITE_UGF_API_KEY",
    "VITE_DONATION_CONTRACT_ADDRESS",
    "VITE_WALLET_CONNECT_PROJECT_ID"
  ],
  "ugf_integration_ready": false,
  "architecture": "Wallet + UGF (keep all wallet integration!)"
}
```

---

## Summary
Current project is already set up for **Wallet + UGF flow**! We just need to:
1. Implement real UGF SDK integration in `ugf.js`
2. Deploy Donation contract to Base Sepolia
3. Set environment variables
4. Test the flow

**No need to remove wallet integration - keep it all!**
