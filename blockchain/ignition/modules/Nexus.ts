import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NexusModule", (m) => {
  // Use official TYI_MOCK_USD address from environment
  const tyiMockUSD = m.getParameter("TYI_MOCK_USD_ADDRESS", "0x27DC1C167AeF232bb1e21073304B526726a8727e");

  const donation = m.contract("Donation", [tyiMockUSD]);

  return { donation };
});
