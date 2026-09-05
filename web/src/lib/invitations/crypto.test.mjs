import assert from "node:assert/strict";
import test from "node:test";

import { decryptInvitation, encryptInvitation } from "./crypto.ts";

test("round trips a multiline Unicode perspective", async () => {
  const perspective = "Primera linea\n第二行\n🪴 Cacti are resilient";
  const { envelope, decryptionKey } = await encryptInvitation({ perspective });

  assert.deepEqual(await decryptInvitation(envelope, decryptionKey), { perspective });
  assert.deepEqual(Object.keys(envelope).sort(), ["algorithm", "ciphertext", "iv", "version"]);
  assert.equal(Object.hasOwn(envelope, "key"), false);
});

test("uses different ciphertext for repeated encryption", async () => {
  const invitation = { perspective: "The same invitation, encrypted twice." };
  const first = await encryptInvitation(invitation);
  const second = await encryptInvitation(invitation);

  assert.notEqual(first.envelope.ciphertext, second.envelope.ciphertext);
  assert.notEqual(first.decryptionKey, second.decryptionKey);
  assert.notEqual(first.envelope.iv, second.envelope.iv);
});

test("rejects an envelope with an incorrect key", async () => {
  const { envelope } = await encryptInvitation({ perspective: "Private perspective" });
  const other = await encryptInvitation({ perspective: "Different key" });

  await assert.rejects(decryptInvitation(envelope, other.decryptionKey));
});

test("rejects a tampered ciphertext", async () => {
  const { envelope, decryptionKey } = await encryptInvitation({ perspective: "Integrity matters" });
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
  const { envelope, decryptionKey } = await encryptInvitation({ perspective: "Validation matters" });

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
