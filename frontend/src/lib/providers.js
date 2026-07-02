import { JsonRpcProvider } from 'ethers';

/**
 * Base Sepolia network definition for ethers.js v6.
 * ENS is explicitly set to null to prevent "network does not support ENS" errors,
 * since Base Sepolia has no ENS registry deployed.
 */
export const BASE_SEPOLIA_NETWORK = {
  name: 'base-sepolia',
  chainId: 84532,
  ensAddress: null,    // Disable ENS — not available on Base Sepolia
  ensNetwork: null,    // Prevent cross-chain ENS resolution attempts
};

const BASE_SEPOLIA_RPCS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
  'https://base-sepolia.gateway.tenderly.co'
];

/**
 * Returns a working JsonRpcProvider by testing multiple RPC URLs.
 * If one fails or cannot be resolved, it transparently falls back to the next one.
 */
export async function getFallbackProvider(network = BASE_SEPOLIA_NETWORK, options = { staticNetwork: true }) {
  for (const url of BASE_SEPOLIA_RPCS) {
    try {
      console.log(`Connecting to Base Sepolia RPC: ${url}`);
      const provider = new JsonRpcProvider(url, network, options);
      // Perform a lightweight request to verify the connection works
      await provider.getNetwork();
      console.log(`Connected successfully to RPC: ${url}`);
      return provider;
    } catch (err) {
      console.warn(`RPC connection failed for ${url}:`, err.message || err);
    }
  }
  
  console.error("All Base Sepolia RPC endpoints failed to connect. Falling back to default.");
  return new JsonRpcProvider(BASE_SEPOLIA_RPCS[0], network, options);
}
