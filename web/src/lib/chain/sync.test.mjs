import assert from "node:assert/strict";
import test from "node:test";

import { tryOpenOnChain, tryCloseOnChain, trySolveOnChain } from "./sync.ts";

function makeFakeClient(overrides = {}) {
  return {
    async openCase() {},
    async closeCase() {},
    async solveCase() {},
    ...overrides,
  };
}

test("tryOpenOnChain calls openCase with caseId and ciphertext", async () => {
  let called = null;
  const fake = makeFakeClient({
    async openCase(caseId, content) { called = { caseId, content }; },
  });
  await tryOpenOnChain("case-1", "ciphertext-abc", () => fake);
  assert.deepEqual(called, { caseId: "case-1", content: "ciphertext-abc" });
});

test("tryOpenOnChain does not throw if openCase fails", async () => {
  const fake = makeFakeClient({
    async openCase() { throw new Error("network error"); },
  });
  await assert.doesNotReject(() => tryOpenOnChain("case-1", "ciphertext-abc", () => fake));
});

test("tryOpenOnChain does not throw if getClient fails (missing env vars)", async () => {
  await assert.doesNotReject(() =>
    tryOpenOnChain("case-1", "ciphertext-abc", () => {
      throw new Error("Missing CaseRegistry config");
    }),
  );
});

test("tryCloseOnChain calls closeCase with the correct caseId", async () => {
  let called = null;
  const fake = makeFakeClient({
    async closeCase(caseId) { called = caseId; },
  });
  await tryCloseOnChain("case-1", () => fake);
  assert.equal(called, "case-1");
});

test("tryCloseOnChain does not throw if closeCase fails", async () => {
  const fake = makeFakeClient({
    async closeCase() { throw new Error("network error"); },
  });
  await assert.doesNotReject(() => tryCloseOnChain("case-1", () => fake));
});

test("trySolveOnChain calls solveCase with the correct caseId", async () => {
  let called = null;
  const fake = makeFakeClient({
    async solveCase(caseId) { called = caseId; },
  });
  await trySolveOnChain("case-1", () => fake);
  assert.equal(called, "case-1");
});

test("trySolveOnChain does not throw if solveCase fails", async () => {
  const fake = makeFakeClient({
    async solveCase() { throw new Error("network error"); },
  });
  await assert.doesNotReject(() => trySolveOnChain("case-1", () => fake));
});
