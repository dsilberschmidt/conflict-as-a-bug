import assert from "node:assert/strict";
import test from "node:test";

import { tryConsentOnChain, tryCloseOnChain, trySolveOnChain } from "./sync.ts";

function makeFakeClient(overrides = {}) {
  return {
    async consentToOpen() {},
    async closeCase() {},
    async solveCase() {},
    ...overrides,
  };
}

test("tryConsentOnChain calls consentToOpen with caseId, content, and signature", async () => {
  let called = null;
  const fake = makeFakeClient({
    async consentToOpen(caseId, content, signature) { called = { caseId, content, signature }; },
  });
  await tryConsentOnChain("case-1", "ciphertext-abc", "0xsig", () => fake);
  assert.deepEqual(called, { caseId: "case-1", content: "ciphertext-abc", signature: "0xsig" });
});

test("tryConsentOnChain does not throw if consentToOpen fails", async () => {
  const fake = makeFakeClient({
    async consentToOpen() { throw new Error("network error"); },
  });
  await assert.doesNotReject(() => tryConsentOnChain("case-1", "ciphertext-abc", "0xsig", () => fake));
});

test("tryConsentOnChain does not throw if getClient fails (missing env vars)", async () => {
  await assert.doesNotReject(() =>
    tryConsentOnChain("case-1", "ciphertext-abc", "0xsig", () => {
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
