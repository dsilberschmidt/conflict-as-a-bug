import { NextRequest, NextResponse } from "next/server";

import { caseStore } from "../../../../../lib/cases/store";

/** Anonymous, unmoderated free-text contribution from a solver. No auth, no profile. */
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

  const text = (body as Record<string, unknown> | null)?.text;
  const rawSeeking = (body as Record<string, unknown> | null)?.seekingBackers;
  const seekingBackers = typeof rawSeeking === "boolean" ? rawSeeking : undefined;

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Expected { text: string }" }, { status: 400 });
  }

  try {
    const contribution = await caseStore.addContribution(caseId, text, seekingBackers);
    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case not found")) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message.startsWith("Case is not open")) {
      return NextResponse.json({ error: "Case is closed to new contributions" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to add contribution" }, { status: 500 });
  }
}
