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
import { ethers } from 'ethers';
import { getFallbackProvider } from './providers';

// Global monkeypatch for BigInt serialization in JSON.stringify to prevent
// "TypeError: Do not know how to serialize a BigInt" in wallet providers.
if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

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
 * @param {string} payerAddress
 * @param {bigint|number|string} campaignId
 * @param {bigint} amount
 * @param {string} message
 * @param {bigint} deadline
 * @param {number} v
 * @param {string} r
 * @param {string} s
 * @returns {string} Encoded calldata (hex)
 */
export function encodeDonationWithPermitTransaction(payerAddress, campaignId, amount, message, deadline, v, r, s) {
  return encodeFunctionData({
    abi: DonationABI,
    functionName: 'donateToCampaignWithPermit',
    args: [payerAddress, safeParseCampaignId(campaignId), BigInt(amount), message, BigInt(deadline), v, r, s],
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
  // Note: we MUST include 'from' field so that UGF gateway can parse payer details.
  const txObject = JSON.stringify({
    from: payerAddress,
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
export async function donateWithUGF({ signer, provider, campaignId, amount, message, tokenType = 'USDC', receivingAddress, onProgress }) {
  const progress = onProgress || (() => {});
  const client = getUGFClient();
  const payerAddress = await signer.getAddress();

  // 1. Authenticate with UGF
  progress('auth', { status: 'Authenticating with Universal Gas Framework...' });
  if (!isUGFAuthenticated()) {
    await loginToUGF(signer);
  }
  progress('auth', { status: 'Authenticated with Universal Gas Framework!' });

  // 2. Prepare transaction parameters
  progress('prepare', { status: 'Preparing donation transaction...' });
  const finalReceivingAddress = ethers.getAddress(receivingAddress || '0xf9770f2bec2e1353478d021b41146e5a1b70dd7c');
  
  let toAddress = finalReceivingAddress;
  let txValue = '0';
  let txData = '0x';
  let decimals = 18;

  if (tokenType === 'ETH') {
    toAddress = finalReceivingAddress;
    txValue = ethers.parseEther(amount).toString();
    txData = '0x';
  } else {
    // For ERC20 tokens
    let tokenAddress = '';
    if (tokenType === 'USDC') {
      tokenAddress = ethers.getAddress('0x036cbd53842c5426634e7929541ec2318f3dcf7e'); // Base Sepolia USDC
      decimals = 6; // USDC has 6 decimals
    } else if (tokenType === 'EURC') {
      tokenAddress = ethers.getAddress('0x808456652fdb597867f38412077A9182bf77359F'); // Base Sepolia EURC
      decimals = 6; // EURC has 6 decimals
    } else if (tokenType === 'TYI_MOCK_USD') {
      tokenAddress = ethers.getAddress('0x27DC1C167AeF232bb1e21073304B526726a8727e'); // Tychi Labs Mock USD
      decimals = 6; // Mock USD has 6 decimals
    }

    toAddress = tokenAddress;
    const amountWei = ethers.parseUnits(amount, decimals);

    // Pre-flight balance check to prevent MetaMask/estimateGas silent reverts
    const tokenContract = new ethers.Contract(tokenAddress, [
      'function balanceOf(address owner) view returns (uint256)'
    ], provider);
    const balance = await tokenContract.balanceOf(payerAddress);
    if (balance < amountWei) {
      const humanBalance = ethers.formatUnits(balance, decimals);
      throw new Error(`Insufficient ${tokenType} balance! Your wallet has ${humanBalance} ${tokenType} at address ${tokenAddress}, but you tried to donate ${amount} ${tokenType}. Please use the Circle Faucet to get mock tokens.`);
    }
    
    const erc20Interface = new ethers.Interface([
      'function transfer(address to, uint256 value) returns (bool)'
    ]);
    txData = erc20Interface.encodeFunctionData('transfer', [finalReceivingAddress, amountWei]);
    txValue = '0';
  }

  // 3. Get quote from UGF
  progress('quote', { status: 'Requesting gas sponsorship quote...' });
  const txObject = JSON.stringify({
    from: payerAddress,
    to: toAddress,
    value: txValue,
    data: txData,
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

  // Calculate user-friendly quote fee representation (MockUSD usually has 6 decimals)
  const feeDisplay = (parseFloat(quote.payment_amount) / 1e6).toFixed(2);
  progress('quote', {
    status: `Quote received! Gas fee: ${feeDisplay} TYI_MOCK_USD.`,
    paymentAmount: quote.payment_amount,
    gasAmount: quote.gas_amount,
    digest: quote.digest,
  });

  // 3.5. Check if user has enough TYI_MOCK_USD to pay the UGF gas fee
  const tyiMockUSDAddress = CONTRACT_ADDRESSES.baseSepolia.tyiMockUSD;
  const tyiContract = new ethers.Contract(tyiMockUSDAddress, [
    'function balanceOf(address owner) view returns (uint256)'
  ], provider);
  const tyiBalance = await tyiContract.balanceOf(payerAddress);
  const requiredFee = BigInt(quote.payment_amount);
  if (tyiBalance < requiredFee) {
    const humanTyiBalance = (parseFloat(tyiBalance.toString()) / 1e6).toFixed(2);
    throw new Error(`Insufficient TYI_MOCK_USD for UGF gas fees! The transaction requires a fee of ${feeDisplay} TYI_MOCK_USD to sponsor gas on Base Sepolia, but your wallet currently has ${humanTyiBalance} TYI_MOCK_USD. Please connect your wallet to the UGF Faucet (https://faucet.tychilabs.com/) to get free TYI_MOCK_USD.`);
  }

  // 4. Pay UGF Gas fee (sign and submit x402 payment in TYI_MOCK_USD)
  progress('payment', { status: 'Please sign the gas fee payment of TYI_MOCK_USD in MetaMask...' });
  await client.payment.x402.execute({ quote, signer });
  progress('payment', { status: 'Gas fee successfully paid!' });

  // 5. Execute sponsored transaction
  progress('execute', { status: 'Executing sponsored transfer on-chain...' });
  
  const result = await client.chains.evm.sponsorAndExecute(
    quote.digest,
    signer,
    async () => ({
      to: toAddress,
      value: BigInt(txValue),
      data: txData,
    }),
    {
      maxAttempts: 35,
      intervalMs: 2500,
      onTick: (status, attempt) => {
        progress('execute', {
          status: `Sponsorship confirmed! Waiting for transaction execution... (attempt ${attempt})`,
          txStatus: status.status,
        });
      },
    }
  );

  progress('complete', {
    status: 'Donation successful!',
    userTxHash: result.userTxHash,
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
