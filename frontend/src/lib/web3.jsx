import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import {
  baseSepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

export const config = getDefaultConfig({
  appName: 'Disaster Relief Transparent Donation Network',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'f246a67a5872d1fbe3fef519eacd900a',
  chains: [baseSepolia],
  ssr: false, // Disabled SSR for standard client-only Vite SPA to fix connection hangs
  transports: {
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
