import { Wallet } from 'ethers';

const privateKey = import.meta.env.VITE_DEV_PRIVATE_KEY;

/**
 * Check if the developer private key is configured in .env
 */
export function isDevWalletEnabled() {
  return (
    typeof privateKey === 'string' &&
    privateKey.trim() !== '' &&
    (privateKey.startsWith('0x') ? privateKey.length === 66 : privateKey.length === 64)
  );
}

/**
 * Derives the wallet address from the configured private key
 */
export function getDevWalletAddress() {
  if (!isDevWalletEnabled()) return null;
  try {
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(formattedKey);
    return wallet.address;
  } catch (e) {
    console.error('Failed to parse VITE_DEV_PRIVATE_KEY:', e);
    return null;
  }
}

/**
 * Creates and returns an ethers Wallet instance connected to the provider
 */
export function getDevSigner(provider) {
  if (!isDevWalletEnabled()) return null;
  try {
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new Wallet(formattedKey, provider);
  } catch (e) {
    console.error('Failed to get Dev Signer:', e);
    return null;
  }
}

/**
 * Check if the developer wallet is currently active (connected)
 */
export function isDevWalletConnected() {
  return localStorage.getItem('nexus_use_dev_wallet') === 'true';
}

/**
 * Connect the developer wallet
 */
export function connectDevWallet() {
  localStorage.setItem('nexus_use_dev_wallet', 'true');
  window.dispatchEvent(new Event('nexus-dev-wallet-change'));
}

/**
 * Disconnect the developer wallet
 */
export function disconnectDevWallet() {
  localStorage.setItem('nexus_use_dev_wallet', 'false');
  window.dispatchEvent(new Event('nexus-dev-wallet-change'));
}
