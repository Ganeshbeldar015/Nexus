import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NexusModule", (m) => {
  const mockUSD = m.contract("MockUSD");
  const ngoRegistry = m.contract("NGORegistry");

  const donation = m.contract("Donation", [mockUSD, ngoRegistry]);

  return { mockUSD, ngoRegistry, donation };
});
