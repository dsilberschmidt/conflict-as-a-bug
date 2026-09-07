import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/**
 * Sepolia RPC URL and the backend's private key are read from env vars.
 * PROVISIONAL: a single backend-held key signs every on-chain transition on
 * behalf of both parties (see CaseRegistry.sol). This is the stand-in for
 * Privy's per-party wallet signatures, planned for the bonus phase.
 */
const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      type: "http",
      // Placeholder keeps config validation happy when unset; only matters
      // if you actually run `--network sepolia` without SEPOLIA_RPC_URL set.
      url: process.env.SEPOLIA_RPC_URL ?? "http://localhost:8545",
      accounts: process.env.BACKEND_SIGNER_PRIVATE_KEY
        ? [process.env.BACKEND_SIGNER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
