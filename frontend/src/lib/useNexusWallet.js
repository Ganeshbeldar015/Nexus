import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { BrowserProvider, JsonRpcProvider } from 'ethers';
import {
  isDevWalletConnected,
  getDevWalletAddress,
  getDevSigner,
  disconnectDevWallet,
  isDevWalletEnabled,
  connectDevWallet
} from './devWallet';

export function useNexusWallet() {
  const wagmiAccount = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const [isDevConnected, setIsDevConnected] = useState(isDevWalletConnected());

  useEffect(() => {
    const handleDevWalletChange = () => {
      setIsDevConnected(isDevWalletConnected());
    };
    window.addEventListener('nexus-dev-wallet-change', handleDevWalletChange);
    return () => window.removeEventListener('nexus-dev-wallet-change', handleDevWalletChange);
  }, []);

  const enabled = isDevWalletEnabled();
  const active = isDevConnected && enabled;

  const isConnected = wagmiAccount.isConnected || active;
  const address = active ? getDevWalletAddress() : wagmiAccount.address;

  const getSigner = useCallback(async () => {
    if (active) {
      // Connect to Base Sepolia provider for standard RPC actions
      const provider = new JsonRpcProvider('https://sepolia.base.org');
      return getDevSigner(provider);
    }
    
    if (!wagmiWalletClient) throw new Error('Wallet not connected. Please connect your wallet first.');
    
    // Convert wagmi's wallet client to ethers signer
    // wagmiWalletClient exposes an EIP-1193 compatible transport
    try {
      // Try using the wallet client's transport directly
      const provider = new BrowserProvider(wagmiWalletClient.transport || wagmiWalletClient);
      return await provider.getSigner();
    } catch (err) {
      console.warn('Failed to create signer from wallet client transport, trying window.ethereum:', err);
      
      // Fallback: use window.ethereum if available
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        return await provider.getSigner();
      }
      
      throw new Error('Could not create wallet signer. Please ensure your wallet extension is installed and connected.');
    }
  }, [wagmiWalletClient, active]);

  const disconnect = useCallback(() => {
    if (active) {
      disconnectDevWallet();
    }
  }, [active]);

  const connectDev = useCallback(() => {
    if (enabled) {
      connectDevWallet();
    }
  }, [enabled]);

  return {
    isConnected,
    address,
    getSigner,
    isDevWallet: active,
    isDevWalletEnabled: enabled,
    connectDevWallet: connectDev,
    disconnect,
    // Expose wagmi status for UI feedback
    isConnecting: wagmiAccount.isConnecting,
    isReconnecting: wagmiAccount.isReconnecting,
  };
}
