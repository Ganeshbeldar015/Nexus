export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    donation: import.meta.env.VITE_DONATION_CONTRACT_ADDRESS || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    tyiMockUSD: import.meta.env.VITE_TYI_MOCK_USD_ADDRESS || '0x2198301820A38102A88aA8bcF988F781a9862cd5',
  },
};

export const DEFAULT_CHAIN = 'baseSepolia';
export const TYI_MOCK_USD_SYMBOL = 'TYI_MOCK_USD';
