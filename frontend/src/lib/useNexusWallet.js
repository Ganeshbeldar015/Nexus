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
    
    if (!wagmiWalletClient) throw new Error('Wallet not connected');
    const provider = new BrowserProvider(wagmiWalletClient.transport);
    return provider.getSigner();
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
  };
}
