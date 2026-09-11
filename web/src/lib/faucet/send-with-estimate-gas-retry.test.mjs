import assert from "node:assert/strict";
import test from "node:test";

import {
  ESTIMATE_GAS_RETRY_DELAY_MS,
  sendWithEstimateGasRetry,
} from "./send-with-estimate-gas-retry.ts";

function estimateGasError() {
  const error = new Error("missing revert data");
  error.code = "CALL_EXCEPTION";
  error.action = "estimateGas";
  return error;
}

test("retries one pre-broadcast estimateGas failure and sends one transaction", async () => {
  let attempts = 0;
  let broadcasts = 0;
  const events = [];
  const transaction = { hash: "0xtransaction" };

  const result = await sendWithEstimateGasRetry(async () => {
    attempts += 1;
    events.push(`attempt-${attempts}`);
    if (attempts === 1) throw estimateGasError();
    broadcasts += 1;
    return transaction;
  }, async (delayMs) => {
    events.push(`wait-${delayMs}`);
  });

  assert.equal(attempts, 2);
  assert.equal(broadcasts, 1);
  assert.equal(result, transaction);
  assert.deepEqual(events, ["attempt-1", `wait-${ESTIMATE_GAS_RETRY_DELAY_MS}`, "attempt-2"]);
});

test("returns a controlled error after estimateGas retries are exhausted", async () => {
  let attempts = 0;
  const waits = [];

  await assert.rejects(
    sendWithEstimateGasRetry(async () => {
      attempts += 1;
      throw estimateGasError();
    }, async (delayMs) => { waits.push(delayMs); }),
    { message: "Could not estimate transaction gas. Please try again." },
  );
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [ESTIMATE_GAS_RETRY_DELAY_MS]);
});

test("propagates a non-retryable error immediately", async () => {
  const error = new Error("user rejected request");
  error.code = "ACTION_REJECTED";
  let attempts = 0;
  let waits = 0;

  await assert.rejects(
    sendWithEstimateGasRetry(async () => {
      attempts += 1;
      throw error;
    }, async () => { waits += 1; }),
    (received) => received === error,
  );
  assert.equal(attempts, 1);
  assert.equal(waits, 0);
});
