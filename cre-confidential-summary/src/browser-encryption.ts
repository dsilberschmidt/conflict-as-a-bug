import {
  AES_GCM_IV_BYTES,
  base64UrlDecode,
  base64UrlEncode,
  ENVELOPE_ALGORITHM,
  ENVELOPE_VERSION,
  envelopeAad,
  MAX_PLAINTEXT_BYTES,
  privateKeySecretId,
  type EncryptedSummaryEnvelope,
} from "./envelope.js";

export type SummaryPublicKey = {
  keyId: string;
  algorithm: typeof ENVELOPE_ALGORITHM;
  spki: string;
};

function decodePublicKey(value: string): Uint8Array {
  return base64UrlDecode(value, 1, 4096);
}

/**
 * Web Crypto's BufferSource types require an ArrayBuffer-backed value. Copying
 * also guarantees that a caller cannot mutate the bytes while an operation is
 * in progress.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/**
 * Browser-only encryption. Do not import this module into the CRE workflow:
 * CRE uses QuickJS/WASM, not browser Web Crypto.
 */
export async function encryptSummaryInput(
  text: string,
  publicKey: SummaryPublicKey,
): Promise<EncryptedSummaryEnvelope> {
  const plaintext = new TextEncoder().encode(text);
  if (!text.trim() || plaintext.length > MAX_PLAINTEXT_BYTES) {
    throw new Error("INVALID_INPUT");
  }
  if (publicKey.algorithm !== ENVELOPE_ALGORITHM || !publicKey.keyId) {
    throw new Error("INVALID_PUBLIC_KEY");
  }
  privateKeySecretId(publicKey.keyId);

  const rsaKey = await crypto.subtle.importKey(
    "spki",
    toArrayBuffer(decodePublicKey(publicKey.spki)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const ivBuffer = toArrayBuffer(iv);
  const aadBuffer = toArrayBuffer(envelopeAad(publicKey.keyId));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: ivBuffer, additionalData: aadBuffer, tagLength: 128 },
      aesKey,
      toArrayBuffer(plaintext),
    ),
  );
  const rawAesKey = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  const wrappedKey = new Uint8Array(
    await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, toArrayBuffer(rawAesKey)),
  );

  return {
    version: ENVELOPE_VERSION,
    algorithm: ENVELOPE_ALGORITHM,
    keyId: publicKey.keyId,
    wrappedKey: base64UrlEncode(wrappedKey),
    iv: base64UrlEncode(iv),
    ciphertext: base64UrlEncode(ciphertext),
  };
}
