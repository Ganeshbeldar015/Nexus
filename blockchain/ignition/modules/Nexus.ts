import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NexusModule", (m) => {
  // Use official TYI_MOCK_USD address from environment
  // From UGF faucet: 0x27DC...727e
  const tyiMockUSD = m.getParameter("TYI_MOCK_USD_ADDRESS", "0x27DC...727e");

  const donation = m.contract("Donation", [tyiMockUSD]);

  return { donation };
});
