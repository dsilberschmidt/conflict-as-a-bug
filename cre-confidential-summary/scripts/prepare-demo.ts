import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { encryptSummaryInput } from "../src/browser-encryption.ts";
import { ENVELOPE_ALGORITHM } from "../src/envelope.ts";

const directory = mkdtempSync(join(tmpdir(), "cab-cre-demo-"));

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const text =
  "Person A says late-night guitar practice wakes them and continued after requests to stop at 10 p.m. Person B says evenings are the only time available to prepare for an audition and they cannot afford sound isolation. Both want a workable arrangement.";

const envelope = await encryptSummaryInput(text, {
  keyId: "v1",
  algorithm: ENVELOPE_ALGORITHM,
  spki: Buffer.from(publicKey).toString("base64url"),
});

const privateKeyPath = join(directory, "private.pem");
writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
writeFileSync(join(directory, "payload.json"), JSON.stringify(envelope));

console.log(`export CAB_KEY_DIR=${JSON.stringify(directory)}`);
console.log(
  `export SUMMARY_RSA_PRIVATE_V1_PEM="$(cat ${JSON.stringify(privateKeyPath)})"`,
);
