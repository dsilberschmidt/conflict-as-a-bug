import { pathToFileURL } from "node:url";

import {
  addInviteePerspective,
  createInitialInvitation,
  encryptInvitation,
  reviewParaphrase,
  submitParaphrase,
} from "../src/lib/invitations/crypto.ts";
import { createInvitationLink } from "../src/lib/invitations/link.ts";

const INVITER_PERSPECTIVE =
  "I felt dismissed when our plan changed without a conversation.";
const INVITEE_PERSPECTIVE =
  "I was trying to respond to an urgent problem while keeping everyone informed.";
const INVITER_PARAPHRASE =
  "I understand that you felt urgency and tried to keep everyone informed while solving the problem.";
const INVITEE_PARAPHRASE =
  "I understand that the plan changing without a conversation made you feel dismissed.";

export function parseBaseUrl(argumentsList) {
  if (argumentsList.length !== 1) {
    throw new Error("Usage: npm run generate:confirmed-invite -- <base-url>");
  }

  let baseUrl;
  try {
    baseUrl = new URL(argumentsList[0]);
  } catch {
    throw new Error("Base URL must be a valid absolute URL");
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("Base URL must use http or https");
  }
  return baseUrl.toString();
}

export async function generateConfirmedInvitationLink(baseUrl) {
  const withInvitee = addInviteePerspective(
    createInitialInvitation(INVITER_PERSPECTIVE),
    INVITEE_PERSPECTIVE,
  );
  const inviterAccepted = reviewParaphrase(
    submitParaphrase(withInvitee, "inviter", INVITER_PARAPHRASE),
    "invitee",
    true,
  );
  const confirmed = reviewParaphrase(
    submitParaphrase(inviterAccepted, "invitee", INVITEE_PARAPHRASE),
    "inviter",
    true,
  );

  return createInvitationLink(baseUrl, await encryptInvitation(confirmed));
}

async function main() {
  const baseUrl = parseBaseUrl(process.argv.slice(2));
  process.stdout.write(`${await generateConfirmedInvitationLink(baseUrl)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Could not generate invitation"}\n`);
    process.exitCode = 1;
  });
}
