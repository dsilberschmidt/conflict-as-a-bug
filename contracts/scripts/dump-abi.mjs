import { compileContract } from "../test/compile.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { abi } = compileContract("CaseRegistry.sol", "CaseRegistry");
const outPath = path.join(__dirname, "..", "CaseRegistry.abi.json");
fs.writeFileSync(outPath, JSON.stringify(abi, null, 2) + "\n");
console.log("Wrote", outPath, "-", abi.length, "ABI entries");
