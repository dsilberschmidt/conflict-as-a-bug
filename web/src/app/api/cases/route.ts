import { NextRequest, NextResponse } from "next/server";

import type { CaseRecord } from "../../../lib/cases/types";
import { caseStore } from "../../../lib/cases/store";
import { toPublicCase, sortCasesByCreatedAt } from "../../../lib/cases/public-view";
import type { Consent, EncryptedInvitationEnvelope } from "../../../lib/invitations/crypto";
import { tryConsentOnChain } from "../../../lib/chain/sync";

function isEnvelope(value: unknown): value is EncryptedInvitationEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.version === "string" &&
    typeof record.algorithm === "string" &&
    typeof record.iv === "string" &&
    typeof record.ciphertext === "string"
  );
}

function isConsent(value: unknown): value is Consent {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.address === "string" && typeof record.signature === "string";
}

function isConsentsArray(value: unknown): value is [Consent, Consent] {
  return Array.isArray(value) && value.length === 2 && value.every(isConsent);
}

/**
 * Creates a case record once both parties have consented to open it to solvers.
 * Expects { caseId, envelope, consents } where consents is exactly 2 ECDSA
 * signatures over keccak256(caseId ++ stateHash(envelope)). Both consents are
 * relayed to the contract sequentially (same backendSigner nonce avoidance).
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const record = body as Record<string, unknown> | null;
  const caseId = record?.caseId;
  const envelope = record?.envelope;
  const consents = record?.consents;

  if (
    typeof caseId !== "string" ||
    !caseId ||
    !isEnvelope(envelope) ||
    !isConsentsArray(consents)
  ) {
    return NextResponse.json(
      {
        error:
          "Expected { caseId: string, envelope: EncryptedInvitationEnvelope, consents: [Consent, Consent] }",
      },
      { status: 400 },
    );
  }

  let created: CaseRecord;

  try {
    // consents[0].address is an arbitrary demo choice for the recipient — see types.ts.
    created = await caseStore.createCase(caseId, envelope, consents[0].address);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case already exists")) {
      return NextResponse.json({ error: "Case already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create case" }, { status: 500 });
  }

  const content = JSON.stringify(envelope);
  await tryConsentOnChain(caseId, content, consents[0].signature);
  await tryConsentOnChain(caseId, content, consents[1].signature);

  return NextResponse.json(toPublicCase(created), { status: 201 });
}

/**
 * Lists open cases for the public showcase.
 *
 * PROVISIONAL: reads the backend's own status listing. Once the Sepolia
 * contract exists, the showcase must read the list of open cases from the
 * contract instead, using this endpoint only to fetch each case's content.
 */
export async function GET() {
  const caseIds = await caseStore.listCasesByStatus("opened");
  const records = await Promise.all(caseIds.map((id) => caseStore.getCase(id)));
  const cases = sortCasesByCreatedAt(
    records
      .filter((record): record is CaseRecord => record !== null)
      .map(toPublicCase),
  );

  return NextResponse.json({ cases });
}
