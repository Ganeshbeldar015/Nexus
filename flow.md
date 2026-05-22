# Nexus Donation Platform - System Flow

## Overview
This document explains the complete flow of the Nexus blockchain donation platform, including wallet integration, blockchain interactions, and token handling.

---

## System Architecture

```
Frontend (React + Vite)
├── UI Components
├── Auth (Supabase)
├── Web3 Integration (RainbowKit + Wagmi + Viem)
└── UGF Service Layer (ugf.js)
    └── ↕️
Blockchain (Solidity + Hardhat)
└── Donation Contract (TYI_MOCK_USD native)
    ├── Ownable access control
    ├── Verified NGOs feature
    └── ↕️
Base Sepolia Network
    └── ↕️
UGF (Universal Gas Framework)
    └── ↕️
TYI_MOCK_USD (Official Token)
```

---

## 1. User Onboarding & Wallet Connection

### Flow Steps:
1. User visits the platform
2. User clicks "Connect Wallet" button
3. **RainbowKit** shows wallet options (MetaMask, Coinbase Wallet, etc.)
4. User selects and connects their wallet
5. **Wagmi** manages wallet state and provides hooks
6. Frontend receives connected wallet address and chain

### Key Files:
- `frontend/src/lib/web3.jsx`: Web3 provider setup
- `frontend/src/components/Navbar.jsx`: Connect wallet button (likely here)

---

## 2. User Authentication (Optional - Supabase)

The platform also uses Supabase for user management. This likely handles:
- User profiles (donor, NGO, admin)
- Roles and permissions
- Off-chain data storage

### Key Files:
- `frontend/src/lib/supabase.js`: Supabase client
- `frontend/src/context/AuthContext.jsx`: Auth state management

---

## 3. Verifying NGOs (Owner Only)

### Flow Steps:
1. Contract owner (deployer) connects wallet
2. Owner calls `Donation.verifyNgo(ngoAddress, true)`
3. Transaction is signed by owner
4. Gas fees paid in ETH
5. NGO is marked as verified on-chain
6. `NgoVerified` event is emitted

### Smart Contract Interaction:
```solidity
// Donation.sol
function verifyNgo(address _ngo, bool _status) public onlyOwner {
    verifiedNgos[_ngo] = _status;
    emit NgoVerified(_ngo, _status);
}
```

### Important:
- Only contract owner (deployer) can verify NGOs
- Verified NGOs can create campaigns

---

## 4. Creating a Campaign (Verified NGO Only)

### Flow Steps:
1. **Verified NGO** user navigates to campaign creation page
2. Fills out form: title, description, target amount
3. Submits form
4. Frontend calls `Donation.createCampaign()` via Wagmi
5. **Transaction is signed** by NGO's wallet
6. **Gas fees are paid** in ETH (Base Sepolia ETH)
7. Transaction is mined on Base Sepolia
8. Campaign is created on-chain

### Smart Contract Interaction:
```solidity
// Donation.sol
function createCampaign(
    string memory _title,
    string memory _description,
    uint256 _targetAmount
) public {
    require(verifiedNgos[msg.sender], "Only verified NGOs can create campaigns");
    campaignCount++;
    campaigns[campaignCount] = Campaign(...);
    emit CampaignCreated(...);
}
```

### Gas Fees:
- Paid in **Base Sepolia ETH**
- Paid by the **campaign creator (NGO)**
- Automatically deducted from wallet when transaction is sent

---

## 5. Token Setup

### **Option A: Custom MockUSD (Local Testing Only)**
- `MockUSD.sol` has a public `mint()` function
- Anyone can mint tokens to any address
- MockUSD now supports EIP-2612 Permit for off-chain approvals
- For local testing only

### **Option B: TYI_MOCK_USD (Recommended for Hackathon/UGF)**
- **Recommended**: Use TYI_MOCK_USD as both donation token and UGF settlement token
- No custom MockUSD contract needed - huge simplification!
- Donation contract accepts any ERC20 in constructor - just pass TYI_MOCK_USD address

### Flow (for local testing with custom MockUSD):
1. User calls `MockUSD.mint(userAddress, amount)`
2. Receives MockUSD tokens in their wallet

### Note:
In a real production scenario, this would be restricted or replaced with actual stablecoin integration.

---

## 6. Donating to a Campaign (Donor)

### **Option 1: Traditional 2-Step Process (Requires ETH for gas)**

#### Step 1: Approve Token Spending
Before donating, the donor must approve the Donation contract to spend their MockUSD.

**Why?** The Donation contract uses `transferFrom()` to pull tokens from the donor's wallet, which requires prior approval.

Flow:
1. Donor enters donation amount
2. Frontend calls `MockUSD.approve(donationContractAddress, amount)`
3. Donor signs transaction
4. Gas fees paid in ETH
5. Approval is recorded on-chain

#### Step 2: Execute Donation
After approval, the donor can complete the donation.

Flow:
1. Frontend calls `Donation.donateToCampaign(campaignId, amount, message)`
2. Donor signs transaction
3. Gas fees paid in ETH
4. Contract **pulls tokens** via `transferFrom()`
5. Campaign's `raisedAmount` is updated
6. Donation history is recorded
7. `Donated` event is emitted

### **Option 2: Single Transaction with Permit + UGF (Recommended - No ETH needed for donor!)

This is the recommended flow for the hackathon. Uses EIP-2612 Permit to allow off-chain signed approval, so it can be done in a single transaction, and UGF can handle the gas fees.

#### Complete UGF Flow:
1. User connects wallet
2. User selects campaign
3. User enters donation amount
4. Frontend prepares donation transaction data
5. UGF generates execution quote (shows donation + fee to user)
6. User approves MockUSD payment (signs permit message off-chain - NO GAS!)
7. UGF executes donation transaction remotely on Base Sepolia
8. Smart contract records donation
9. Frontend updates campaign dashboard

#### Detailed Steps (Technical):
1. Donor enters donation amount
2. Frontend generates a permit signature (using wallet's signPermit)
3. Frontend prepares encoded transaction data for `donateToCampaignWithPermit()`
4. Frontend calls UGF SDK with transaction data
5. UGF generates execution quote
6. User confirms
7. **UGF executes the transaction** (pays gas fees!)
8. Contract executes permit (off-chain approval becomes on-chain)
9. Contract pulls tokens via `transferFrom()`
10. Campaign's `raisedAmount` updated
11. Donation recorded
12. `Donated` event emitted

### Smart Contract Interaction (Permit Version):
```solidity
// Donation.sol
function donateToCampaignWithPermit(
    uint256 _campaignId,
    uint256 _amount,
    string memory _message,
    uint256 _deadline,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
) public {
    require(campaigns[_campaignId].active, "Campaign is not active");
    require(_amount > 0, "Amount must be > 0");

    // Execute permit (off-chain signature becomes on-chain approval)
    IERC20Permit(address(donationToken)).permit(
        msg.sender,
        address(this),
        _amount,
        _deadline,
        _v,
        _r,
        _s
    );

    donationToken.transferFrom(msg.sender, address(this), _amount);
    
    campaigns[_campaignId].raisedAmount += _amount;
    
    donationHistory[_campaignId].push(DonationRecord(...));

    emit Donated(...);
}
```

### Gas Fees:
- **Option 1**: Two transactions → Two ETH gas payments (paid by donor)
- **Option 2**: Single transaction → Gas paid by UGF (donor doesn't need ETH!)

### What About ETH?
- **ETH is NOT donated** - only MockUSD is donated
- For Option 2, ETH gas fees are covered by UGF/relayer
- Donor only signs message off-chain (no gas)

---

## 7. Withdrawing Funds (NGO)

### Flow Steps:
1. NGO navigates to their campaign
2. Enters withdrawal amount
3. Frontend calls `Donation.withdrawFunds(campaignId, amount)`
4. NGO signs transaction
5. Gas fees paid in ETH
6. Contract **transfers tokens** to NGO wallet
7. Campaign's `withdrawnAmount` is updated
8. `FundsWithdrawn` event is emitted

### Smart Contract Interaction:
```solidity
// Donation.sol
function withdrawFunds(uint256 _campaignId, uint256 _amount) public {
    Campaign storage campaign = campaigns[_campaignId];
    require(msg.sender == campaign.ngo, "Only campaign owner can withdraw");
    uint256 available = campaign.raisedAmount - campaign.withdrawnAmount;
    require(_amount <= available, "Insufficient funds");

    campaign.withdrawnAmount += _amount;
    donationToken.transfer(campaign.ngo, _amount);

    emit FundsWithdrawn(...);
}
```

### Gas Fees:
- Paid in **ETH**
- Paid by the **NGO**

---

## 8. Adding Usage Records (NGO)

### Flow Steps:
1. NGO adds a usage record with amount, description, receipt URL
2. Frontend calls `Donation.addUsageRecord()`
3. NGO signs transaction
4. Gas fees paid in ETH
5. Usage record is stored on-chain
6. `UsageRecordAdded` event is emitted

### Purpose:
Transparency - donors can see how funds were used.

---

## 9. Reading Data from Blockchain

All contract data can be read without gas fees (read operations are free):

- `getCampaign(campaignId)` - Get campaign details
- `getDonationHistory(campaignId)` - Get all donations
- `getUsageRecords(campaignId)` - Get usage records
- `campaigns` (public mapping) - Directly access campaign data
- `donationToken` - Get token address
- `campaignCount` - Get total campaigns
- `verifiedNgos(ngoAddress)` - Check if NGO is verified

---

## Current Project Setup - What's Implemented ✅

### Blockchain:
- ✅ Donation.sol contract (ERC20 token donation)
- ✅ Ownable access control
- ✅ Verified NGOs feature
- ✅ MockUSD.sol test token with EIP-2612 Permit support
- ✅ `donateToCampaignWithPermit()` function for single-transaction donations
- ✅ Hardhat config with Base Sepolia
- ✅ Ignition deployment module
- ✅ Test suite (6 passing tests)
- ✅ ABI export script

### Frontend:
- ✅ React + Vite setup
- ✅ RainbowKit + Wagmi + Viem integration
- ✅ Base Sepolia added to chain config
- ✅ Contract ABIs exported
- ✅ Supabase integration
- ✅ UI components and pages
- ✅ `frontend/src/lib/contracts.js`: Contract address config template
- ✅ `frontend/src/lib/ugf.js`: UGF service layer with encoding utilities & placeholder functions
- ✅ `frontend/src/components/UGFDonationTest.jsx`: Test component for UGF donations

### Documentation:
- ✅ status.md - Project status
- ✅ UGF_INTEGRATION.md - UGF integration guide
- ✅ flow.md (this file) - System flow

---

## Missing Pieces / Next Steps ⚠️

### 1. Deploy Contracts to Base Sepolia
- **Needed**: Deploy contracts to Base Sepolia
- **Steps**: Set RPC URL and private key in .env, then run deployment
- **After deployment**: Update `frontend/src/lib/contracts.js` with actual addresses

### 2. Reown Cloud Project ID
- **Missing**: In `web3.jsx`, `projectId: 'YOUR_PROJECT_ID'` needs to be replaced
- **Needed**: Create Reown Cloud project and get actual project ID

### 3. Integrate Actual UGF SDK
- **Needed**: Install and integrate actual UGF SDK
- **See UGF_INTEGRATION.md for instructions
- **Replace placeholder functions in `ugf.js`

### 4. Wallet Token Display
- **Recommended**: Show MockUSD balance in UI
- **Needed**: Use `useReadContract` to fetch token balance

### 5. Event Listening
- **Recommended**: Listen to contract events in frontend for real-time updates
- **Example**: Listen to `Donated` event to refresh donation history

### 6. Error Handling
- **Needed**: Proper error handling for failed transactions
- **Example**: Handle user rejecting transaction, insufficient gas, etc.

### 7. Loading States
- **Needed**: Show loading indicators during transactions

### 8. Transaction Receipts
- **Recommended**: Show transaction hash and link to block explorer

---

## Gas Fees Summary

| Action | Who Pays | Token Used |
|--------|----------|------------|
| Verify NGO | Owner | ETH |
| Create Campaign | Verified NGO | ETH |
| Approve Tokens (Option 1) | Donor | ETH |
| Donate (Option 1) | Donor | ETH (gas) + MockUSD (donation) |
| Donate (Option 2 - UGF) | UGF | ETH (gas) + Donor | MockUSD (donation) |
| Withdraw Funds | NGO | ETH |
| Add Usage Record | NGO | ETH |

**Note**: 
- All gas fees are paid in Base Sepolia ETH, not MockUSD. 
- MockUSD is only used for the actual donation amount.
- With UGF (Option 2), donor does NOT need ETH for gas fees!

---

## File Communication Diagram

```
User Interaction
    ↓
Frontend Components (Pages/Components)
    ↓
UGF Service Layer (ugf.js)
    ↓
RainbowKit (Wallet Connection)
    ↓
Wagmi Hooks (useWriteContract, useReadContract, useSignPermit)
    ↓
Viem (Low-level Ethereum interactions & permit signing)
    ↓
UGF SDK (when integrated)
    ↓
Blockchain RPC (Base Sepolia)
    ↓
Smart Contracts (Donation.sol, MockUSD.sol)
```

### Key Frontend → Blockchain Calls:
- `Donation.verifyNgo()` - Verify NGO (owner only)
- `MockUSD.approve()` → Prior to donation (Option 1)
- `Donation.createCampaign()` → Create campaign (verified NGO only)
- `Donation.donateToCampaign()` → Donate (Option 1)
- `Donation.donateToCampaignWithPermit()` → Donate (Option 2 - UGF)
- `Donation.withdrawFunds()` → Withdraw
- `Donation.addUsageRecord()` → Add transparency record
- Various read calls for displaying data

---

## UGF Integration Files Created:
- `frontend/src/lib/ugf.js` - UGF service layer
- `frontend/src/lib/contracts.js` - Contract addresses
- `frontend/src/components/UGFDonationTest.jsx` - Test component
