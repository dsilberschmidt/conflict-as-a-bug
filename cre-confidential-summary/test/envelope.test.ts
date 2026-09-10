import assert from "node:assert/strict";
import test from "node:test";

import {
  AES_GCM_IV_BYTES,
  base64UrlEncode,
  ENVELOPE_ALGORITHM,
  ENVELOPE_VERSION,
  EnvelopeError,
  RSA_2048_WRAPPED_KEY_BYTES,
  validateEnvelope,
} from "../src/envelope.js";

function syntheticEnvelope() {
  return {
    version: ENVELOPE_VERSION,
    algorithm: ENVELOPE_ALGORITHM,
    keyId: "v1",
    wrappedKey: base64UrlEncode(new Uint8Array(RSA_2048_WRAPPED_KEY_BYTES).fill(1)),
    iv: base64UrlEncode(new Uint8Array(AES_GCM_IV_BYTES).fill(2)),
    ciphertext: base64UrlEncode(new Uint8Array(17).fill(3)),
  };
}

test("accepts the versioned synthetic ciphertext envelope", () => {
  assert.equal(validateEnvelope(syntheticEnvelope()).keyId, "v1");
});

test("rejects altered metadata, fields, encodings, and invalid lengths", () => {
  const invalidInputs = [
    { ...syntheticEnvelope(), version: 2 },
    { ...syntheticEnvelope(), algorithm: "AES-GCM" },
    { ...syntheticEnvelope(), keyId: "bad key id" },
    { ...syntheticEnvelope(), iv: "!" },
    { ...syntheticEnvelope(), extra: "x" },
  ];
  for (const input of invalidInputs) {
    assert.throws(() => validateEnvelope(input), EnvelopeError);
  }
});
