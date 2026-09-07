import { NextRequest, NextResponse } from "next/server";

import { caseStore } from "../../../../../lib/cases/store";

/**
 * Sets the public summary for a case.
 *
 * PROVISIONAL: unauthenticated. Once the Chainlink CRE Confidential Workflow
 * is wired up, this must only be callable by that workflow (shared secret or
 * signed callback), not open to arbitrary callers.
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

  const summary = (body as Record<string, unknown> | null)?.summary;

  if (typeof summary !== "string" || !summary.trim()) {
    return NextResponse.json({ error: "Expected { summary: string }" }, { status: 400 });
  }

  try {
    const record = await caseStore.setSummary(caseId, summary);
    return NextResponse.json({ caseId: record.caseId, summary: record.summary });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case not found")) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to set summary" }, { status: 500 });
  }
}
