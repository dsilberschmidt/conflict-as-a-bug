import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptInvitation,
  isMutualUnderstandingConfirmed,
} from "../src/lib/invitations/crypto.ts";
import { parseInvitationLink } from "../src/lib/invitations/link.ts";
import {
  generateConfirmedInvitationLink,
  parseBaseUrl,
} from "./generate-confirmed-invitation.mjs";

test("parseBaseUrl accepts one absolute HTTP(S) URL", () => {
  assert.equal(parseBaseUrl(["https://preview.example/path"]), "https://preview.example/path");
  assert.throws(() => parseBaseUrl([]), /Usage/);
  assert.throws(() => parseBaseUrl(["/invite"]), /valid absolute URL/);
  assert.throws(() => parseBaseUrl(["ftp://example.test"]), /http or https/);
});

test("generated link parses, decrypts, and opens at mutual understanding", async () => {
  const link = await generateConfirmedInvitationLink("https://preview.example/ignored");
  const parsed = parseInvitationLink(link);
  const invitation = await decryptInvitation(parsed.envelope, parsed.decryptionKey);

  assert.equal(new URL(link).pathname, "/invite");
  assert.equal(isMutualUnderstandingConfirmed(invitation), true);
  assert.deepEqual(invitation.paraphrases, {
    inviter: {
      text: "I understand that you felt urgency and tried to keep everyone informed while solving the problem.",
      status: "accepted",
    },
    invitee: {
      text: "I understand that the plan changing without a conversation made you feel dismissed.",
      status: "accepted",
    },
  });
  assert.equal(invitation.consents, undefined);
  assert.equal(invitation.openEnvelope, undefined);
});

test("each generated link has a new caseId", async () => {
  const first = parseInvitationLink(await generateConfirmedInvitationLink("https://preview.example"));
  const second = parseInvitationLink(await generateConfirmedInvitationLink("https://preview.example"));
  const [firstInvitation, secondInvitation] = await Promise.all([
    decryptInvitation(first.envelope, first.decryptionKey),
    decryptInvitation(second.envelope, second.decryptionKey),
  ]);

  assert.notEqual(firstInvitation.caseId, secondInvitation.caseId);
});
