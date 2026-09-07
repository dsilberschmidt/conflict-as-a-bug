import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys CaseRegistry with the backend signer address as constructor arg.
 *
 * Run with real network access (this module needs `npx hardhat compile` to
 * have succeeded, which downloads solc from binaries.soliditylang.org):
 *
 *   npx hardhat ignition deploy ignition/modules/CaseRegistry.ts \
 *     --network sepolia \
 *     --parameters '{"CaseRegistry":{"backendSignerAddress":"0x..."}}'
 *
 * `backendSignerAddress` should be the address whose private key is set as
 * SEPOLIA_PRIVATE_KEY / BACKEND_SIGNER_PRIVATE_KEY (see hardhat.config.ts) —
 * the same key the app's backend will use to call openCase/closeCase/solveCase.
 */
export default buildModule("CaseRegistry", (m) => {
  const backendSignerAddress = m.getParameter("backendSignerAddress");
  const caseRegistry = m.contract("CaseRegistry", [backendSignerAddress]);

  return { caseRegistry };
});
