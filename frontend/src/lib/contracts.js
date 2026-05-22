export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    donation: import.meta.env.VITE_DONATION_CONTRACT_ADDRESS || 'YOUR_DONATION_CONTRACT_ADDRESS',
    tyiMockUSD: import.meta.env.VITE_TYI_MOCK_USD_ADDRESS || '0x27DC...727e',
  },
};

export const DEFAULT_CHAIN = 'baseSepolia';
export const TYI_MOCK_USD_SYMBOL = 'TYI_MOCK_USD';
