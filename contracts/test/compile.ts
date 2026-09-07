import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, "..", "contracts");

/**
 * Compiles a single contract file via the npm `solc` package (standard-json
 * interface), bypassing Hardhat's own compiler downloader.
 *
 * PROVISIONAL workaround: this sandbox can't reach binaries.soliditylang.org,
 * which is where `npx hardhat compile` fetches its solc binary from. `solc`
 * on npm ships the same solc build as an installable package, so this
 * compiles with the identical compiler version (0.8.28) without the network
 * call. `npx hardhat compile` (and Hardhat Ignition, for the real Sepolia
 * deploy) should be used normally in any environment with network access —
 * this helper exists only for tests here.
 */
export function compileContract(fileName: string, contractName: string) {
  const sourcePath = path.join(CONTRACTS_DIR, fileName);
  const source = fs.readFileSync(sourcePath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      [fileName]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  const errors = (output.errors ?? []).filter(
    (entry: { severity: string }) => entry.severity === "error",
  );

  if (errors.length > 0) {
    throw new Error(
      `Solidity compilation failed:\n${errors.map((e: { formattedMessage: string }) => e.formattedMessage).join("\n")}`,
    );
  }

  const contract = output.contracts[fileName][contractName];

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
  };
}
