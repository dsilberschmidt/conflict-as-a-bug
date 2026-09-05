import assert from "node:assert/strict";
import test from "node:test";

import {
  addInviteePerspective,
  createInitialInvitation,
  decryptInvitation,
  encryptInvitation,
} from "./crypto.ts";

test("round trips a multiline Unicode perspective", async () => {
  const perspective = "Primera linea\n第二行\n🪴 Cacti are resilient";
  const invitation = createInitialInvitation(perspective);
  const { envelope, decryptionKey } = await encryptInvitation(invitation);

  assert.deepEqual(await decryptInvitation(envelope, decryptionKey), invitation);
  assert.deepEqual(Object.keys(envelope).sort(), ["algorithm", "ciphertext", "iv", "version"]);
  assert.equal(Object.hasOwn(envelope, "key"), false);
});

test("creates and updates invitation state", () => {
  const initial = createInitialInvitation("A's perspective");
  const updated = addInviteePerspective(initial, "B's perspective");

  assert.equal(initial.schemaVersion, "v1");
  assert.match(initial.caseId, /^[A-Za-z0-9_-]+$/);
  assert.equal(initial.revision, 1);
  assert.deepEqual(initial.perspectives, { inviter: "A's perspective" });
  assert.equal(updated.caseId, initial.caseId);
  assert.equal(updated.revision, 2);
  assert.deepEqual(updated.perspectives, {
    inviter: "A's perspective",
    invitee: "B's perspective",
  });
});

test("uses different ciphertext for repeated encryption", async () => {
  const invitation = createInitialInvitation("The same invitation, encrypted twice.");
  const first = await encryptInvitation(invitation);
  const second = await encryptInvitation(invitation);

  assert.notEqual(first.envelope.ciphertext, second.envelope.ciphertext);
  assert.notEqual(first.decryptionKey, second.decryptionKey);
  assert.notEqual(first.envelope.iv, second.envelope.iv);
});

test("rejects an envelope with an incorrect key", async () => {
  const { envelope } = await encryptInvitation(createInitialInvitation("Private perspective"));
  const other = await encryptInvitation(createInitialInvitation("Different key"));

  await assert.rejects(decryptInvitation(envelope, other.decryptionKey));
});

test("rejects a tampered ciphertext", async () => {
  const { envelope, decryptionKey } = await encryptInvitation(createInitialInvitation("Integrity matters"));
  const lastCharacter = envelope.ciphertext.at(-1);
  const replacement = lastCharacter === "A" ? "B" : "A";

  await assert.rejects(
    decryptInvitation({
      ...envelope,
      ciphertext: `${envelope.ciphertext.slice(0, -1)}${replacement}`,
    }, decryptionKey),
  );
});

test("rejects malformed envelopes with controlled errors", async () => {
  const { envelope, decryptionKey } = await encryptInvitation(createInitialInvitation("Validation matters"));

  await assert.rejects(decryptInvitation(null, decryptionKey), /Invalid invitation encryption envelope/);
  await assert.rejects(
    decryptInvitation({ ...envelope, version: "v2" }, decryptionKey),
    /Unsupported invitation encryption version/,
  );
  await assert.rejects(
    decryptInvitation({ ...envelope, algorithm: "AES-CBC" }, decryptionKey),
    /Unsupported invitation encryption algorithm/,
  );
  await assert.rejects(decryptInvitation({ ...envelope, iv: "***" }, decryptionKey), /Invalid base64url value/);
  await assert.rejects(decryptInvitation({ ...envelope, iv: "AA" }, decryptionKey), /Invalid invitation encryption material/);
  await assert.rejects(decryptInvitation(envelope, "AA"), /Invalid invitation encryption material/);
  await assert.rejects(
    decryptInvitation({ ...envelope, key: decryptionKey }, decryptionKey),
    /Invalid invitation encryption envelope/,
  );
});
