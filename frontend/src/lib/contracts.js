export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    donation: import.meta.env.VITE_DONATION_CONTRACT_ADDRESS || '0xB509489E5aC6B21Ff2882F70801dE2764Ac5eCAD',
    tyiMockUSD: import.meta.env.VITE_TYI_MOCK_USD_ADDRESS || '0x27DC1C167AeF232bb1e21073304B526726a8727e',
  },
};

export const DEFAULT_CHAIN = 'baseSepolia';
export const TYI_MOCK_USD_SYMBOL = 'TYI_MOCK_USD';
