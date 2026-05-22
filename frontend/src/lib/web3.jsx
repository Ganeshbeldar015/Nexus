import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
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
  ssr: false,
  transports: {
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent aggressive refetching that can interrupt wallet connection flows
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const customTheme = darkTheme({
  accentColor: '#a3e635', // lime-400
  accentColorForeground: 'black',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={customTheme}
          modalSize="compact"
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
