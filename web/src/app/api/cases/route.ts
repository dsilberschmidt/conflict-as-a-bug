import { NextRequest, NextResponse } from "next/server";

import type { CaseRecord } from "../../../lib/cases/types";
import { caseStore } from "../../../lib/cases/store";
import { toPublicCase } from "../../../lib/cases/public-view";
import type { EncryptedInvitationEnvelope } from "../../../lib/invitations/crypto";

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

/**
 * Creates a case record once both parties have consented to open it to
 * solvers.
 *
 * PROVISIONAL: trusts caseId and envelope from the request body as-is. Once
 * the Sepolia contract and Privy consent signing exist, this must instead be
 * gated by a verified on-chain "opened" event for the caseId, not called
 * directly by the client.
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

  if (typeof caseId !== "string" || !caseId || !isEnvelope(envelope)) {
    return NextResponse.json(
      { error: "Expected { caseId: string, envelope: EncryptedInvitationEnvelope }" },
      { status: 400 },
    );
  }

  try {
    const created = await caseStore.createCase(caseId, envelope);
    return NextResponse.json(toPublicCase(created), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case already exists")) {
      return NextResponse.json({ error: "Case already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create case" }, { status: 500 });
  }
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
  const cases = records
    .filter((record): record is CaseRecord => record !== null)
    .map(toPublicCase);

  return NextResponse.json({ cases });
}
