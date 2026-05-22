import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useUGFModal } from '@tychilabs/react-ugf';
import { BrowserProvider, ethers } from 'ethers';
import Button from './Button';
import { CONTRACT_ADDRESSES } from '../lib/contracts';
import {
  encodeDonationTransaction,
  donateWithUGF,
  handleUGFError,
  BASE_SEPOLIA_CHAIN_ID,
} from '../lib/ugf';

/**
 * UGF Donation Test Component
 * 
 * Provides two integration paths for testing:
 * 1. Modal Flow: Uses @tychilabs/react-ugf's built-in UGF modal (simplest)
 * 2. Programmatic Flow: Uses the ugf.js service layer for full control
 */
export function UGFDonationTest() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { openUGF, result: ugfModalResult } = useUGFModal();

  const [campaignId, setCampaignId] = useState('1');
  const [amount, setAmount] = useState('10');
  const [message, setMessage] = useState('Test donation');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [progressSteps, setProgressSteps] = useState([]);

  /**
   * Convert wagmi's walletClient to an ethers v6 Signer.
   */
  const getEthersSigner = useCallback(async () => {
    if (!walletClient) throw new Error('Wallet not connected');
    const provider = new BrowserProvider(walletClient.transport);
    return provider.getSigner();
  }, [walletClient]);

  /**
   * Path 1: Use the UGFProvider's built-in modal.
   * Simplest integration - SDK handles everything.
   */
  const handleDonateWithModal = async () => {
    if (!address || !walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setTxHash(null);

    try {
      const signer = await getEthersSigner();
      const amountWei = ethers.parseEther(amount);
      const encodedData = encodeDonationTransaction(campaignId, amountWei, message);

      // Open the UGF modal — it handles quote, payment, and execution
      openUGF({
        signer,
        tx: {
          to: CONTRACT_ADDRESSES.baseSepolia.donation,
          data: encodedData,
          value: 0,
        },
        destChainId: BASE_SEPOLIA_CHAIN_ID,
      });
    } catch (err) {
      console.error('UGF modal error:', err);
      setError(handleUGFError(err).message);
    }
  };

  /**
   * Path 2: Programmatic flow using ugf.js service layer.
   * Full control over each step with progress updates.
   */
  const handleDonateWithProgrammatic = async () => {
    if (!address || !walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);
    setProgressSteps([]);

    try {
      const signer = await getEthersSigner();
      const provider = signer.provider;

      const result = await donateWithUGF({
        signer,
        provider,
        campaignId,
        amount,
        message,
        onProgress: (step, data) => {
          console.log(`[UGF ${step}]`, data);
          setProgressSteps(prev => [...prev, { step, ...data }]);
        },
      });

      setTxHash(result.userTxHash);
    } catch (err) {
      console.error('UGF programmatic donation failed:', err);
      setError(handleUGFError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update txHash when modal flow completes
  if (ugfModalResult?.txHash && !txHash) {
    setTxHash(ugfModalResult.txHash);
  }

  return (
    <div className="p-6 bg-gray-800 rounded-xl">
      <h2 className="text-xl font-bold text-white mb-2">Test UGF Donation</h2>
      <p className="text-gray-400 text-sm mb-4">
        Donate using MockUSD — no ETH gas needed!
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1 text-sm">Campaign ID</label>
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-1 text-sm">Amount (MockUSD)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-1 text-sm">Message</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Two integration paths */}
        <div className="flex gap-3">
          <Button
            onClick={handleDonateWithModal}
            disabled={isLoading || !address}
            className="flex-1"
          >
            🪟 Donate (Modal)
          </Button>
          <Button
            onClick={handleDonateWithProgrammatic}
            disabled={isLoading || !address}
            className="flex-1"
          >
            {isLoading ? '⏳ Processing...' : '⚡ Donate (Programmatic)'}
          </Button>
        </div>

        {!address && (
          <p className="text-yellow-400 text-sm">⚠️ Connect wallet first</p>
        )}

        {/* Progress steps */}
        {progressSteps.length > 0 && (
          <div className="p-3 bg-gray-900 rounded text-sm space-y-1">
            <p className="text-gray-400 font-semibold mb-1">Progress:</p>
            {progressSteps.map((step, i) => (
              <p key={i} className="text-gray-300">
                <span className="text-blue-400">[{step.step}]</span> {step.status}
              </p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-100 rounded">
            <p className="font-semibold">❌ Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {txHash && (
          <div className="p-3 bg-green-900/50 border border-green-700 text-green-100 rounded">
            <p className="font-semibold">✅ Donation Successful!</p>
            <p className="text-sm break-all">TX: {txHash}</p>
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              View on Base Sepolia Scan →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
