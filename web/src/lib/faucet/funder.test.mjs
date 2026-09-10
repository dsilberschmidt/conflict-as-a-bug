import assert from "node:assert/strict";
import test from "node:test";

import { tryFundWallet } from "./funder.ts";

function makeFakeKv() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async set(key, value) { store.set(key, value); },
  };
}

function makeSender({ txHash = "0xdeadbeef" } = {}) {
  let calls = 0;
  return {
    async send() { calls++; return txHash; },
    get calls() { return calls; },
  };
}

test("first fund: sends ETH and marks wallet as funded", async () => {
  const kv = makeFakeKv();
  const sender = makeSender({ txHash: "0xabc123" });

  const result = await tryFundWallet("0xAAA", { kv, sender });

  assert.equal(result.alreadyFunded, false);
  assert.equal(result.txHash, "0xabc123");
  assert.equal(sender.calls, 1);
});

test("second call for same wallet: skips send, returns alreadyFunded", async () => {
  const kv = makeFakeKv();
  const sender = makeSender();

  await tryFundWallet("0xAAA", { kv, sender });
  const result = await tryFundWallet("0xAAA", { kv, sender });

  assert.equal(result.alreadyFunded, true);
  assert.equal(result.txHash, undefined);
  assert.equal(sender.calls, 1); // second call skipped the send
});
