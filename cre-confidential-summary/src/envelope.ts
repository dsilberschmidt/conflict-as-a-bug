export const ENVELOPE_VERSION = 1 as const;
export const ENVELOPE_ALGORITHM = "RSA-OAEP-256+A256GCM" as const;
export const AES_GCM_IV_BYTES = 12;
export const RSA_2048_WRAPPED_KEY_BYTES = 256;
export const AES_GCM_TAG_BYTES = 16;
export const MAX_PLAINTEXT_BYTES = 96_000;
export const MAX_CIPHERTEXT_BYTES = MAX_PLAINTEXT_BYTES + AES_GCM_TAG_BYTES;

export type EncryptedSummaryEnvelope = {
  version: typeof ENVELOPE_VERSION;
  algorithm: typeof ENVELOPE_ALGORITHM;
  keyId: string;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
};

export class EnvelopeError extends Error {
  constructor() {
    super("INVALID_ENVELOPE");
  }
}

const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const KEY_ID = /^[A-Za-z0-9_-]{1,64}$/u;

export function base64UrlEncode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) encoded += alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) encoded += alphabet[third & 0x3f];
  }
  return encoded;
}

export function base64UrlDecode(value: string, minBytes: number, maxBytes: number): Uint8Array {
  if (!BASE64URL.test(value) || value.length > Math.ceil((maxBytes * 4) / 3) + 4) {
    throw new EnvelopeError();
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const output: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value[index]!);
    const second = alphabet.indexOf(value[index + 1]!);
    const third = index + 2 < value.length ? alphabet.indexOf(value[index + 2]!) : -1;
    const fourth = index + 3 < value.length ? alphabet.indexOf(value[index + 3]!) : -1;
    if (first < 0 || second < 0 || third < -1 || fourth < -1) throw new EnvelopeError();
    output.push((first << 2) | (second >> 4));
    if (third >= 0) output.push(((second & 0x0f) << 4) | (third >> 2));
    if (fourth >= 0) output.push(((third & 0x03) << 6) | fourth);
  }
  if (output.length < minBytes || output.length > maxBytes) throw new EnvelopeError();
  return Uint8Array.from(output);
}

export function envelopeAad(keyId: string): Uint8Array {
  return new TextEncoder().encode(`${ENVELOPE_VERSION}|${ENVELOPE_ALGORITHM}|${keyId}`);
}

export function validateEnvelope(input: unknown): EncryptedSummaryEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new EnvelopeError();
  const record = input as Record<string, unknown>;
  const fields = ["version", "algorithm", "keyId", "wrappedKey", "iv", "ciphertext"];
  if (Object.keys(record).length !== fields.length || !fields.every((field) => field in record)) {
    throw new EnvelopeError();
  }
  if (
    record.version !== ENVELOPE_VERSION ||
    record.algorithm !== ENVELOPE_ALGORITHM ||
    typeof record.keyId !== "string" ||
    !KEY_ID.test(record.keyId) ||
    typeof record.wrappedKey !== "string" ||
    typeof record.iv !== "string" ||
    typeof record.ciphertext !== "string"
  ) {
    throw new EnvelopeError();
  }

  base64UrlDecode(record.wrappedKey, RSA_2048_WRAPPED_KEY_BYTES, RSA_2048_WRAPPED_KEY_BYTES);
  base64UrlDecode(record.iv, AES_GCM_IV_BYTES, AES_GCM_IV_BYTES);
  base64UrlDecode(record.ciphertext, AES_GCM_TAG_BYTES + 1, MAX_CIPHERTEXT_BYTES);
  return record as EncryptedSummaryEnvelope;
}

export function privateKeySecretId(keyId: string): string {
  if (!KEY_ID.test(keyId)) throw new EnvelopeError();
  return `summary_rsa_private_${keyId}`;
}
