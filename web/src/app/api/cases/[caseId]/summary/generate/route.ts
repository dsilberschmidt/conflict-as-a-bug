import { NextRequest, NextResponse } from "next/server";

import { caseStore } from "../../../../../../lib/cases/store";
import { generateSummary } from "../../../../../../lib/ai/summarize";

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

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Expected { text: string }" }, { status: 400 });
  }

  try {
    const existing = await caseStore.getCase(caseId);
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    if (existing.summary) {
      return NextResponse.json({ caseId: existing.caseId, summary: existing.summary });
    }
    const summary = await generateSummary(text);
    const record = await caseStore.setSummary(caseId, summary);
    return NextResponse.json({ caseId: record.caseId, summary: record.summary });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Case not found")) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to generate summary" }, { status: 500 });
  }
}
