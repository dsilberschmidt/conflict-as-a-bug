import { NextRequest, NextResponse } from "next/server";

import { caseStore } from "../../../../../lib/cases/store";
import type { CaseStatus } from "../../../../../lib/cases/types";
import { tryCloseOnChain, trySolveOnChain } from "../../../../../lib/chain/sync";

const VALID_STATUSES: CaseStatus[] = ["opened", "closed", "solved"];

/**
 * Sets case status.
 *
 * PROVISIONAL and explicitly non-authoritative: the Sepolia contract is the
 * source of truth for case status once it exists. This endpoint must
 * eventually only mirror verified on-chain transitions, never accept a
 * client-asserted status directly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = (body as Record<string, unknown> | null)?.status;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as CaseStatus)) {
    return NextResponse.json(
      { error: 'Expected { status: "opened" | "closed" | "solved" }' },
      { status: 400 },
    );
  }

  try {
    const record = await caseStore.setStatus(caseId, status as CaseStatus);
    if (status === "closed") await tryCloseOnChain(caseId);
    if (status === "solved") await trySolveOnChain(caseId);
    return NextResponse.json({ caseId: record.caseId, status: record.status });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case not found")) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to set status" }, { status: 500 });
  }
}
