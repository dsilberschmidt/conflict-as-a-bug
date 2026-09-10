import type { EncryptedSummaryEnvelope } from "./envelope.js";

type TeeHybridCrypto = {
  decrypt(requestJson: string): string;
};

declare global {
  // Registered only by tee-hybrid-crypto-plugin/src/lib.rs in a custom CRE WASM build.
  var teeHybridCrypto: TeeHybridCrypto | undefined;
}

export function decryptInTee(
  privateKeyPem: string,
  envelope: EncryptedSummaryEnvelope,
): string {
  // An absent extension, malformed envelope, wrong key, or failed AEAD tag all
  // collapse to an empty result. The caller emits only a controlled external error.
  return globalThis.teeHybridCrypto?.decrypt(JSON.stringify({ privateKeyPem, envelope })) ?? "";
}
