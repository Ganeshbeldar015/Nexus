import { Wallet, keccak256, toUtf8Bytes } from 'ethers';

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
 * Get private key for a specific role.
 * NGO gets VITE_DEV_NGO_PRIVATE_KEY or a deterministic key derived from VITE_DEV_PRIVATE_KEY.
 * Donor and others get VITE_DEV_PRIVATE_KEY.
 */
export function getPrivateKeyForRole(role) {
  if (!isDevWalletEnabled()) return null;
  const cleanKey = privateKey.trim();
  const formattedKey = cleanKey.startsWith('0x') ? cleanKey : `0x${cleanKey}`;
  
  if (role === 'ngo') {
    const ngoKey = import.meta.env.VITE_DEV_NGO_PRIVATE_KEY;
    if (ngoKey && ngoKey.trim() !== '') {
      return ngoKey.startsWith('0x') ? ngoKey.trim() : `0x${ngoKey.trim()}`;
    }
    // Deterministic derivation for NGO key
    return keccak256(toUtf8Bytes(formattedKey + '_ngo'));
  }
  
  return formattedKey;
}

/**
 * Derives the wallet address from the configured private key
 */
export function getDevWalletAddress(role = localStorage.getItem('nexus_user_role')) {
  if (!isDevWalletEnabled()) return null;
  try {
    const key = getPrivateKeyForRole(role);
    if (!key) return null;
    const wallet = new Wallet(key);
    return wallet.address;
  } catch (e) {
    console.error(`Failed to parse private key for role ${role}:`, e);
    return null;
  }
}

/**
 * Creates and returns an ethers Wallet instance connected to the provider
 */
export function getDevSigner(provider, role = localStorage.getItem('nexus_user_role')) {
  if (!isDevWalletEnabled()) return null;
  try {
    const key = getPrivateKeyForRole(role);
    if (!key) return null;
    return new Wallet(key, provider);
  } catch (e) {
    console.error(`Failed to get Dev Signer for role ${role}:`, e);
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
