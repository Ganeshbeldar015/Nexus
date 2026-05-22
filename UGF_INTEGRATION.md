# UGF (Universal Gas Framework) Integration Guide

## Overview
UGF (Universal Gas Framework) enables blockchain transactions without requiring users to hold ETH for gas fees.

In our Nexus donation platform, UGF will be used to allow donors to contribute using TYI_MOCK_USD while UGF handles transaction execution on Base Sepolia.

This removes blockchain onboarding friction and creates a beginner-friendly donation experience.

## How UGF Changes Our Current Flow
### Traditional Web3 Flow (Current)
Current donation flow requires ETH:

- User connects wallet
- User approves TYI_MOCK_USD spending
- User calls donation function
- User pays ETH gas for approval
- User pays ETH gas for donation

**Problem:**
- Two transactions
- Two gas payments
- Bad UX
- Not aligned with hackathon objective

### Updated UGF Flow (Target)
New flow:

- User connects wallet
- User selects campaign
- User enters donation amount
- Frontend prepares donation transaction data
- UGF generates execution quote
- User approves TYI_MOCK_USD payment
- UGF executes donation transaction on Base Sepolia
- Smart contract records donation
- Frontend updates campaign dashboard

**Result:**
User donates without needing ETH.

## Integration Architecture
User
 ↓
React Frontend
 ↓
RainbowKit Wallet Connection
 ↓
UGF SDK
 ↓
TYI_MOCK_USD Payment Approval
 ↓
UGF Remote Transaction Execution
 ↓
Base Sepolia Blockchain
 ↓
Donation Smart Contract (Ownable + Verified NGOs)
 ↓
Campaign Updated

## Implementation Steps
### 1. Install UGF SDK
Frontend installation:

```bash
npm install @tychilabs/react-ugf
```

Alternative lower-level SDK:

```bash
npm install @tychilabs/ugf-testnet-js
```

**Recommended:**
Use @tychilabs/react-ugf for easier integration.

### 2. Keep Existing Wallet Integration
Existing stack remains:

- RainbowKit
- wagmi
- viem

Wallet is still required for:

- user identity
- transaction signing
- payment approval

UGF only removes ETH gas dependency.

### 3. Create UGF Service Layer
Create:
`frontend/src/lib/ugf.js`

Responsibilities:

- initialize UGF SDK
- generate quotes
- execute transactions
- handle errors

Example functions:
- `getDonationQuote()`
- `executeDonationWithUGF()`
- `handleUGFError()`

### 4. Prepare Smart Contract Call Data
UGF needs encoded transaction data.

Target smart contract functions (two options):

**Option A: Traditional (requires ETH)**
- `donateToCampaign(campaignId, amount, message)`

**Option B: Permit-based (Recommended for UGF - No ETH needed!)**
- `donateToCampaignWithPermit(campaignId, amount, message, deadline, v, r, s)`

Frontend will encode this call using ABI.

Example for permit-based:
```javascript
encodeFunctionData({
  abi: DonationABI,
  functionName: "donateToCampaignWithPermit",
  args: [campaignId, amount, message, deadline, v, r, s]
})
```

This encoded data is passed to UGF.

**Why Option B is better:**
- Single transaction instead of two
- Uses EIP-2612 Permit for off-chain approval
- UGF can execute the transaction, so donor doesn't need ETH

### 5. Replace Traditional Donation Logic
Old flow:

approve()
donate()

Remove this donor flow.

Replace with:

handleDonateWithUGF()

New flow:

prepare transaction data
request UGF quote
show fee confirmation
approve TYI_MOCK_USD payment
execute via UGF
return transaction hash

## Donation Execution Flow
1. User clicks Donate
2. Frontend collects: campaign ID, donation amount, optional message
3. Frontend encodes donation transaction
4. UGF generates execution quote
5. User confirms payment
6. UGF executes transaction remotely
7. UGF handles: gas fees, transaction submission, blockchain execution
8. Smart contract updates: raised amount, donation history, donor record
9. Frontend displays: Donation Successful, Transaction Hash, View on Base Explorer

## Frontend Files Involved
### Existing
- Wallet setup: `frontend/src/lib/web3.jsx`
- Contract ABI: `frontend/src/lib/abi/`
- Donation UI: `frontend/src/pages/`

### New
- UGF service: `frontend/src/lib/ugf.js`
- Contract addresses: `frontend/src/lib/contracts.js`

## Smart Contract Requirements
Donation contract must support:
- `donateToCampaign(campaignId, amount, message)`
- `donateToCampaignWithPermit(campaignId, amount, message, deadline, v, r, s)`
- Ownable access control for verifying NGOs
- Verified NGOs feature (only verified NGOs can create campaigns)

Current contract already supports all of these! It uses ERC20 token donation with transferFrom() and also supports EIP-2612 Permit.

### Token Choice: Use TYI_MOCK_USD
- **Recommended**: Use TYI_MOCK_USD as both donation token and UGF settlement token
- **No custom MockUSD contract needed** - huge simplification!
- Donation contract accepts any ERC20 in constructor - just pass TYI_MOCK_USD address

## Immediate Development Priority
Before full frontend integration:
Build a simple test button: Test UGF Donation

Goal: Successful Base Sepolia donation transaction through UGF.

Only after this works: proceed with full donation UI.

## Expected Outcome
Final donor experience:
- Connect wallet
- Choose campaign
- Enter donation amount
- Approve TYI_MOCK_USD payment
- Donation succeeds

No ETH required.

## Key Benefit
This aligns directly with hackathon requirements:
- beginner-friendly dApp
- no ETH gas dependency
- practical blockchain use case
- smooth Web3 UX
