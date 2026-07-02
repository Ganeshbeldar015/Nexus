import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { BrowserProvider, getAddress } from 'ethers';
import {
  isDevWalletConnected,
  getDevWalletAddress,
  getDevSigner,
  disconnectDevWallet,
  isDevWalletEnabled,
  connectDevWallet
} from './devWallet';
import { BASE_SEPOLIA_NETWORK, getFallbackProvider } from './providers';

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
      // Connect to Base Sepolia provider with ENS disabled and robust fallbacks
      const provider = await getFallbackProvider();
      return getDevSigner(provider);
    }
    
    if (wagmiWalletClient) {
      // Convert wagmi's wallet client to ethers signer
      // wagmiWalletClient exposes an EIP-1193 compatible transport
      try {
        // Try using the wallet client's transport directly, with ENS disabled
        const provider = new BrowserProvider(wagmiWalletClient.transport || wagmiWalletClient, BASE_SEPOLIA_NETWORK);
        
        // Wrap provider's send method to checksum address parameters in signature requests
        const originalSend = provider.send.bind(provider);
        provider.send = async (method, params) => {
          if (params) {
            if (method === 'personal_sign' && params[1]) {
              try {
                params[1] = getAddress(params[1]);
              } catch (e) {
                console.warn('Could not checksum address in personal_sign wrapper:', e);
              }
            } else if ((method === 'eth_signTypedData_v4' || method.includes('signTypedData')) && params[0]) {
              try {
                params[0] = getAddress(params[0]);
              } catch (e) {
                console.warn('Could not checksum address in signTypedData wrapper:', e);
              }
            }
          }
          return originalSend(method, params);
        };

        return await provider.getSigner();
      } catch (err) {
        console.warn('Failed to create signer from wallet client transport, trying window.ethereum:', err);
      }
    }
    
    // Fallback: use window.ethereum if available, with ENS disabled
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum, BASE_SEPOLIA_NETWORK);
        
        // Wrap provider's send method to checksum address parameters in signature requests
        const originalSend = provider.send.bind(provider);
        provider.send = async (method, params) => {
          if (params) {
            if (method === 'personal_sign' && params[1]) {
              try {
                params[1] = getAddress(params[1]);
              } catch (e) {
                console.warn('Could not checksum address in personal_sign wrapper:', e);
              }
            } else if ((method === 'eth_signTypedData_v4' || method.includes('signTypedData')) && params[0]) {
              try {
                params[0] = getAddress(params[0]);
              } catch (e) {
                console.warn('Could not checksum address in signTypedData wrapper:', e);
              }
            }
          }
          return originalSend(method, params);
        };

        return await provider.getSigner();
      } catch (err) {
        console.warn('Failed to get signer from window.ethereum:', err);
      }
    }
    
    throw new Error('Wallet not connected. Please connect your wallet first.');
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
