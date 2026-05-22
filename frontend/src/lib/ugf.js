/**
 * UGF (Universal Gas Framework) Service Layer
 * 
 * Uses @tychilabs/ugf-testnet-js for low-level UGF operations.
 * For React component integration, see UGFProvider from @tychilabs/react-ugf in App.jsx.
 * 
 * Two integration paths available:
 * 
 * 1. React Modal (recommended for simple flows):
 *    - Wrap app in <UGFProvider mode="testnet">
 *    - Use useUGFModal() hook → openUGF({ signer, tx, destChainId })
 *    - SDK handles the entire quote → pay → execute flow in a built-in modal
 * 
 * 2. Programmatic (this file - for custom UI flows):
 *    - Create UGFClient
 *    - Auth: login with signer
 *    - Get quote
 *    - Pay via x402 (sign + submit)
 *    - Poll/wait for completion
 *    - Execute the user's transaction with sponsored gas
 */

import {
  UGFClient,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_TYPE,
  TYI_USD_PAYMENT_COIN,
} from '@tychilabs/ugf-testnet-js';
import { CONTRACT_ADDRESSES } from './contracts';
import DonationABI from './abi/Donation.json';
import MockUSDABI from './abi/MockUSD.json';
import { encodeFunctionData } from 'viem';
<<<<<<< HEAD
import { Contract, Signature, ethers } from 'ethers';
=======
import { ethers } from 'ethers';
>>>>>>> 83043256144952cb3c70cce543ec1b7f69edf6d6

// ─── Constants ───────────────────────────────────────────────────────────────

export { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_TYPE, TYI_USD_PAYMENT_COIN };

export const UGF_CONFIG = {
  chainId: BASE_SEPOLIA_CHAIN_ID, // "84532"
  chainType: BASE_SEPOLIA_CHAIN_TYPE, // "evm"
  paymentCoin: TYI_USD_PAYMENT_COIN, // "TYI_MOCK_USD"
};

// ─── Singleton Client ────────────────────────────────────────────────────────

let _ugfClient = null;

/**
 * Get or create the UGFClient singleton.
 * Uses testnet defaults (no baseUrl/token needed initially).
 */
export function getUGFClient() {
  if (!_ugfClient) {
    _ugfClient = new UGFClient();
  }
  return _ugfClient;
}

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Authenticate with UGF using an ethers Signer.
 * Must be called before requesting quotes or executing transactions.
 * 
 * @param {import('ethers').Signer} signer - ethers v6 signer
 * @returns {Promise<string>} JWT token
 */
export async function loginToUGF(signer) {
  const client = getUGFClient();
  const token = await client.auth.login(signer);
  return token;
}

/**
 * Check if user is authenticated with UGF.
 * @returns {boolean}
 */
export function isUGFAuthenticated() {
  const client = getUGFClient();
  return client.auth.getToken() !== null;
}

// ─── Transaction Encoding ────────────────────────────────────────────────────

/**
 * Safely parse a campaign ID (which could be a number, a numeric string, or a UUID string) to a BigInt.
 * If it is a UUID string, it removes the hyphens and parses it as a hexadecimal number.
 * 
 * @param {string|number|bigint} id 
 * @returns {bigint}
 */
export function safeParseCampaignId(id) {
  if (id === null || id === undefined) return 1n;
  if (typeof id === 'bigint') return id;
  if (typeof id === 'number') return BigInt(id);
  
  const idStr = String(id).trim();
  if (idStr.includes('-')) {
    try {
      const cleanHex = idStr.replace(/-/g, '');
      return BigInt('0x' + cleanHex);
    } catch (e) {
      console.warn("Failed to parse UUID campaignId to BigInt, falling back to 1", e);
      return 1n;
    }
  }
  
  try {
    return BigInt(idStr);
  } catch (e) {
    console.warn("Failed to parse campaignId to BigInt, falling back to 1", e);
    return 1n;
  }
}

/**
 * Encode a donateToCampaign call for the Donation contract.
 * 
 * @param {bigint|number|string} campaignId 
 * @param {bigint} amount - Amount in token base units (wei)
 * @param {string} message - Donation message
 * @returns {string} Encoded calldata (hex)
 */
export function encodeDonationTransaction(campaignId, amount, message) {
  return encodeFunctionData({
    abi: DonationABI,
    functionName: 'donateToCampaign',
    args: [safeParseCampaignId(campaignId), BigInt(amount), message],
  });
}

/**
 * Encode a donateToCampaignWithPermit call (when permit support is added to contract).
 * 
 * @param {bigint|number|string} campaignId
 * @param {bigint} amount
 * @param {string} message
 * @param {bigint} deadline
 * @param {number} v
 * @param {string} r
 * @param {string} s
 * @returns {string} Encoded calldata (hex)
 */
export function encodeDonationWithPermitTransaction(campaignId, amount, message, deadline, v, r, s) {
  return encodeFunctionData({
    abi: DonationABI,
    functionName: 'donateToCampaignWithPermit',
    args: [safeParseCampaignId(campaignId), BigInt(amount), message, BigInt(deadline), v, r, s],
  });
}

// ─── Quote ───────────────────────────────────────────────────────────────────

/**
 * Request a gas sponsorship quote from UGF.
 * 
 * @param {object} params
 * @param {string} params.payerAddress - The donor's wallet address
 * @param {string} params.to - Target contract address (Donation contract)
 * @param {string} params.data - Encoded transaction calldata
 * @param {string} [params.value='0'] - ETH value (usually '0' for ERC20 donations)
 * @returns {Promise<import('@tychilabs/ugf-testnet-js').QuoteResponse>}
 */
export async function getDonationQuote({ payerAddress, to, data, value = '0' }) {
  const client = getUGFClient();

  // Build the tx_object as a JSON string (what UGF expects)
  const txObject = JSON.stringify({
    to,
    value,
    data,
  });

  const quote = await client.quote.get({
    payment_coin: UGF_CONFIG.paymentCoin,
    payer_address: payerAddress,
    payment_chain: UGF_CONFIG.chainId,
    payment_chain_type: UGF_CONFIG.chainType,
    tx_object: txObject,
    dest_chain_id: UGF_CONFIG.chainId,
    dest_chain_type: UGF_CONFIG.chainType,
  });

  return quote;
}

// ─── Payment (x402) ─────────────────────────────────────────────────────────

/**
 * Sign and submit an x402 payment for the quote.
 * This pays the gas fee in TYI_MOCK_USD.
 * 
 * @param {import('@tychilabs/ugf-testnet-js').QuoteResponse} quote
 * @param {import('ethers').Signer} signer
 * @param {import('ethers').Provider} provider
 * @returns {Promise<import('@tychilabs/ugf-testnet-js').PaymentSubmitResponse>}
 */
export async function payForGas(quote, signer, provider) {
  const client = getUGFClient();
  return client.payment.x402.signAndSubmit(quote, signer, provider);
}

// ─── Execution ───────────────────────────────────────────────────────────────

/**
 * Wait for UGF sponsorship to complete, then execute the user's transaction
 * using the sponsored gas.
 * 
 * @param {string} digest - The quote digest (from QuoteResponse)
 * @param {import('ethers').Signer} signer
 * @param {Function} buildTx - Async function that returns a TransactionRequest
 * @param {object} [pollOptions] - Polling options { maxAttempts, intervalMs, onTick }
 * @returns {Promise<{ userTxHash: string }>}
 */
export async function executeSponsoredTransaction(digest, signer, buildTx, pollOptions) {
  const client = getUGFClient();
  return client.chains.evm.sponsorAndExecute(digest, signer, buildTx, pollOptions);
}

/**
 * Wait for a sponsored transaction to reach a terminal state.
 * 
 * @param {string} digest
 * @param {object} [pollOptions]
 * @returns {Promise<import('@tychilabs/ugf-testnet-js').StatusResponse>}
 */
export async function waitForCompletion(digest, pollOptions) {
  const client = getUGFClient();
  return client.chains.evm.waitForCompletion(digest, pollOptions);
}

/**
 * Check the status of a UGF transaction.
 * 
 * @param {string} digest
 * @returns {Promise<import('@tychilabs/ugf-testnet-js').StatusResponse>}
 */
export async function getTransactionStatus(digest) {
  const client = getUGFClient();
  return client.status.get(digest);
}

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * Get the payment option details for TYI_MOCK_USD.
 */
export async function getPaymentOption() {
  const client = getUGFClient();
  return client.registry.getOption(UGF_CONFIG.paymentCoin);
}

/**
 * Get chain entry for TYI_MOCK_USD on Base Sepolia.
 */
export async function getChainEntry() {
  const client = getUGFClient();
  return client.registry.getChainEntry(UGF_CONFIG.paymentCoin, UGF_CONFIG.chainId);
}

// ─── High-Level Donation Flow ────────────────────────────────────────────────

/**
 * Complete UGF donation flow (programmatic - for custom UI).
 * 
 * Steps:
 * 1. Authenticate with UGF (if not already)
 * 2. Encode the donation transaction
 * 3. Get a gas sponsorship quote
 * 4. Pay the gas fee via x402
 * 5. Execute the sponsored transaction
 * 
 * @param {object} params
 * @param {import('ethers').Signer} params.signer - ethers v6 signer
 * @param {import('ethers').Provider} params.provider - ethers v6 provider
 * @param {number|bigint} params.campaignId
 * @param {string} params.amount - Human-readable amount (e.g. "10" for 10 MockUSD)
 * @param {string} params.message - Donation message
 * @param {Function} [params.onProgress] - Progress callback: (step, data) => void
 * @returns {Promise<{ userTxHash: string, digest: string }>}
 */
export async function donateWithUGF({ signer, provider, campaignId, amount, message, onProgress }) {
  const progress = onProgress || (() => {});
  const donationContractAddress = CONTRACT_ADDRESSES.baseSepolia.donation;
  const tokenAddress = CONTRACT_ADDRESSES.baseSepolia.tyiMockUSD;
  const payerAddress = await signer.getAddress();

  // 1. Authenticate
  progress('auth', { status: 'Authenticating with UGF...' });
  if (!isUGFAuthenticated()) {
    await loginToUGF(signer);
  }
  progress('auth', { status: 'Authenticated' });

<<<<<<< HEAD
  // 2. Sign Permit (Gasless Approval)
=======
  // 2. Obtain EIP-2612 Permit Signature (Gasless Approval)
>>>>>>> 83043256144952cb3c70cce543ec1b7f69edf6d6
  progress('permit_signing', { status: 'Please sign the gasless MockUSD approval in your wallet...' });

  let amountWei;
  try {
    amountWei = ethers.parseEther(amount);
  } catch {
    amountWei = BigInt(amount) * BigInt(10 ** 18);
  }
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1-hour expiration
  
  // Connect to the token contract to fetch the current nonce of the payer
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function nonces(address owner) view returns (uint256)',
      'function name() view returns (string)'
    ],
    provider
  );
  
  let nonce;
  let tokenName = 'TYI_MOCK_USD';
  try {
    nonce = await tokenContract.nonces(payerAddress);
  } catch (nonceErr) {
    console.warn('Could not fetch token nonce directly, defaulting to 0:', nonceErr);
    nonce = 0n;
  }
  
  try {
    tokenName = await tokenContract.name();
  } catch (nameErr) {
    console.warn('Could not fetch token name, defaulting to TYI_MOCK_USD:', nameErr);
  }

  // Define Domain and Types for the EIP-712 Signature
  const domain = {
    name: tokenName,
    version: '1',
    chainId: Number(BASE_SEPOLIA_CHAIN_ID),
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const value = {
    owner: payerAddress,
    spender: donationContractAddress,
    value: amountWei,
    nonce: nonce,
    deadline: deadline,
  };

<<<<<<< HEAD
  // Sign typed data using the ethers signer
=======
  // Sign the typed permit data
>>>>>>> 83043256144952cb3c70cce543ec1b7f69edf6d6
  const signature = await signer.signTypedData(domain, types, value);
  const sig = ethers.Signature.from(signature);
  progress('permit_signing', { status: 'MockUSD Permit approved!' });

  // 3. Encode transaction with permit
  progress('encode', { status: 'Preparing transaction...' });
  const encodedData = encodeDonationWithPermitTransaction(
    campaignId,
    amountWei,
    message,
    deadline,
    sig.v,
    sig.r,
    sig.s
  );
  progress('encode', { status: 'Transaction prepared' });

  // 4. Get quote
  progress('quote', { status: 'Getting gas sponsorship quote...' });
  const quote = await getDonationQuote({
    payerAddress,
    to: donationContractAddress,
    data: encodedData,
  });
  progress('quote', {
    status: 'Quote received',
    paymentAmount: quote.payment_amount,
    gasAmount: quote.gas_amount,
    digest: quote.digest,
    expiresAt: quote.expires_at,
  });

  // 5. Pay for gas
  progress('payment', { status: 'Paying gas fee in MockUSD...' });
  await payForGas(quote, signer, provider);
  progress('payment', { status: 'Gas fee paid' });

  // 6. Execute sponsored transaction
  progress('execute', { status: 'Executing donation on-chain...' });
  const result = await executeSponsoredTransaction(
    quote.digest,
    signer,
    async (s) => ({
      to: donationContractAddress,
      data: encodedData,
      value: 0,
    }),
    {
      maxAttempts: 30,
      intervalMs: 2000,
      onTick: (status, attempt) => {
        progress('execute', {
          status: `Waiting for sponsorship... (attempt ${attempt})`,
          txStatus: status.status,
        });
      },
    }
  );

  progress('complete', {
    status: 'Donation successful!',
    userTxHash: result.userTxHash,
    digest: quote.digest,
  });

  return {
    userTxHash: result.userTxHash,
    digest: quote.digest,
  };
}

// ─── Error Handling ──────────────────────────────────────────────────────────

/**
 * Convert a UGF error into a user-friendly message.
 * 
 * @param {Error} error
 * @returns {Error} User-friendly error
 */
export function handleUGFError(error) {
  // UGF SDK specific error types
  if (error?.constructor?.name === 'UGFAuthError') {
    return new Error('Authentication failed. Please reconnect your wallet and try again.');
  }
  if (error?.constructor?.name === 'UGFTimeoutError') {
    return new Error('Transaction timed out. Please try again.');
  }
  if (error?.constructor?.name === 'UGFSignatureError') {
    return new Error('Signature rejected. Please approve the transaction in your wallet.');
  }

  // HTTP-level errors
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return new Error(`Invalid request: ${error.message}`);
      case 401:
        return new Error('Authentication expired. Please reconnect.');
      case 403:
        return new Error('Forbidden. Insufficient permissions.');
      case 429:
        return new Error('Too many requests. Please wait and try again.');
      default:
        return new Error(`UGF Error (${error.statusCode}): ${error.message}`);
    }
  }

  // Generic errors
  if (error.message?.includes('user rejected') || error.message?.includes('User denied')) {
    return new Error('Transaction was rejected by user.');
  }

  return new Error(error.message || 'An unknown UGF error occurred.');
}
