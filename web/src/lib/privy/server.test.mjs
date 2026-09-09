import assert from "node:assert/strict";
import test from "node:test";

import { resolvePrivyIdentity, PrivyAuthError } from "./server.ts";

function makeVerifier({
  userId = "did:privy:user-1",
  wallets = [{ address: "0xAAA", walletIndex: 0 }],
} = {}) {
  return {
    async verifyAccessToken() { return { userId }; },
    async getEmbeddedEthereumWallets() { return wallets; },
  };
}

test("valid token resolves userId and wallet", async () => {
  const id = await resolvePrivyIdentity("Bearer tok.valid.here", { verifier: makeVerifier() });
  assert.equal(id.userId, "did:privy:user-1");
  assert.equal(id.walletAddress, "0xAAA");
});

test("absent token throws PrivyAuthError 401 without calling verifier", async () => {
  let called = false;
  const verifier = {
    async verifyAccessToken() { called = true; return { userId: "x" }; },
    async getEmbeddedEthereumWallets() { return []; },
  };
  await assert.rejects(
    () => resolvePrivyIdentity(null, { verifier }),
    (err) => err instanceof PrivyAuthError && err.status === 401,
  );
  assert.equal(called, false);
});

test("invalid token (verifier throws) produces PrivyAuthError 401", async () => {
  const verifier = {
    async verifyAccessToken() { throw new Error("jwt expired"); },
    async getEmbeddedEthereumWallets() { return []; },
  };
  await assert.rejects(
    () => resolvePrivyIdentity("Bearer bad.tok.en", { verifier }),
    (err) => err instanceof PrivyAuthError && err.status === 401,
  );
});

test("user with no embedded wallet throws PrivyAuthError 422", async () => {
  const verifier = makeVerifier({ wallets: [] });
  await assert.rejects(
    () => resolvePrivyIdentity("Bearer valid.tok.en", { verifier }),
    (err) => err instanceof PrivyAuthError && err.status === 422,
  );
});

test("declared wallet not belonging to user throws PrivyAuthError 403", async () => {
  const verifier = makeVerifier({ wallets: [{ address: "0xAAA", walletIndex: 0 }] });
  await assert.rejects(
    () => resolvePrivyIdentity("Bearer valid.tok.en", {
      verifier,
      requiredWalletAddress: "0xBBB",
    }),
    (err) => err instanceof PrivyAuthError && err.status === 403,
  );
});

test("multiple wallets: returns the one with walletIndex 0", async () => {
  const verifier = makeVerifier({
    wallets: [
      { address: "0xBBB", walletIndex: 1 },
      { address: "0xAAA", walletIndex: 0 },
    ],
  });
  const id = await resolvePrivyIdentity("Bearer valid.tok.en", { verifier });
  assert.equal(id.walletAddress, "0xAAA");
});
