import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
  baseSepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

export const config = getDefaultConfig({
  appName: 'Disaster Relief Transparent Donation Network',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c',
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia, baseSepolia],
  ssr: false, // Disabled SSR for standard client-only Vite SPA to fix connection hangs
  transports: {
    [mainnet.id]: http('https://cloudflare-eth.com'),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
