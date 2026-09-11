import assert from "node:assert/strict";
import test from "node:test";

import {
  FAUCET_CONFIRMATION_TIMEOUT_MS,
  requestFaucet,
  waitForFaucetTransaction,
} from "./client.ts";

const txHash = `0x${"a".repeat(64)}`;

test("requestFaucet returns a valid successful faucet transaction hash", async () => {
  const result = await requestFaucet("token", async (url, init) => {
    assert.equal(url, "/api/faucet");
    assert.deepEqual(init, { method: "POST", headers: { Authorization: "Bearer token" } });
    return { ok: true, json: async () => ({ txHash }) };
  });

  assert.equal(result.txHash, txHash);
});

test("requestFaucet surfaces a controlled server error", async () => {
  await assert.rejects(
    requestFaucet("token", async () => ({ ok: false, json: async () => ({ error: "Not authorized" }) })),
    { message: "Not authorized" },
  );
});

test("waitForFaucetTransaction uses the supplied provider receipt", async () => {
  let observedHash;
  await waitForFaucetTransaction(
    { waitForTransaction: async (hash) => { observedHash = hash; return { hash }; } },
    txHash,
  );
  assert.equal(observedHash, txHash);
});

test("waitForFaucetTransaction bounds the provider wait and reports a missing receipt", async () => {
  let waitArguments;
  await assert.rejects(
    waitForFaucetTransaction({
      waitForTransaction: async (...args) => { waitArguments = args; return null; },
    }, txHash),
    { message: "Faucet transaction was not confirmed in time. Please try again." },
  );
  assert.deepEqual(waitArguments, [txHash, 1, FAUCET_CONFIRMATION_TIMEOUT_MS]);
});

test("waitForFaucetTransaction converts the provider timeout into a controlled error", async () => {
  await assert.rejects(
    waitForFaucetTransaction({
      waitForTransaction: async () => {
        const error = new Error("provider timed out");
        error.code = "TIMEOUT";
        throw error;
      },
    }, txHash),
    { message: "Faucet transaction was not confirmed in time. Please try again." },
  );
});
