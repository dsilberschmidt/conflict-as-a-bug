import assert from "node:assert/strict";
import test from "node:test";

import { createInitialInvitation, decryptInvitation, encryptInvitation } from "./crypto.ts";
import { createInvitationLink, parseInvitationLink } from "./link.ts";

const baseUrl = "https://example.test/application";

test("round trips an encrypted invitation through a portable link", async () => {
  const perspective = "A multiline perspective\ncon Unicode: こんにちは";
  const state = createInitialInvitation(perspective);
  const invitation = await encryptInvitation(state);
  const link = createInvitationLink(baseUrl, invitation);
  const parsed = parseInvitationLink(link);

  assert.deepEqual(await decryptInvitation(parsed.envelope, parsed.decryptionKey), state);
});

test("places the key only in the URL fragment", async () => {
  const invitation = await encryptInvitation(createInitialInvitation("Private perspective"));
  const link = createInvitationLink(baseUrl, invitation);
  const url = new URL(link);

  assert.equal(url.searchParams.has("k"), false);
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("k"), invitation.decryptionKey);
});

test("uses exactly the /invite path", async () => {
  const invitation = await encryptInvitation(createInitialInvitation("Path check"));
  const url = new URL(createInvitationLink(baseUrl, invitation));

  assert.equal(url.pathname, "/invite");
});

test("rejects invalid invitation link structure", async () => {
  const invitation = await encryptInvitation(createInitialInvitation("Validation check"));
  const link = createInvitationLink(baseUrl, invitation);

  const missing = new URL(link);
  missing.searchParams.delete("iv");
  assert.throws(() => parseInvitationLink(missing), /Invalid invitation link/);

  const duplicate = new URL(link);
  duplicate.searchParams.append("v", "v1");
  assert.throws(() => parseInvitationLink(duplicate), /Invalid invitation link/);

  const unsupportedVersion = new URL(link);
  unsupportedVersion.searchParams.set("v", "v2");
  assert.throws(() => parseInvitationLink(unsupportedVersion), /Invalid invitation link/);

  const unsupportedAlgorithm = new URL(link);
  unsupportedAlgorithm.searchParams.set("a", "AES-CBC");
  assert.throws(() => parseInvitationLink(unsupportedAlgorithm), /Invalid invitation link/);

  const unexpected = new URL(link);
  unexpected.searchParams.append("extra", "value");
  assert.throws(() => parseInvitationLink(unexpected), /Invalid invitation link/);

  const wrongPath = new URL(link);
  wrongPath.pathname = "/other";
  assert.throws(() => parseInvitationLink(wrongPath), /Invalid invitation link/);

  const missingKey = new URL(link);
  missingKey.hash = "";
  assert.throws(() => parseInvitationLink(missingKey), /Invalid invitation link/);

  const unexpectedFragment = new URL(link);
  unexpectedFragment.hash = "k=value&extra=value";
  assert.throws(() => parseInvitationLink(unexpectedFragment), /Invalid invitation link/);
});
