import { NextRequest, NextResponse } from "next/server";

import { caseStore } from "../../../../lib/cases/store";
import { toPublicCase } from "../../../../lib/cases/public-view";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  const record = await caseStore.getCase(caseId);

  if (!record) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const contributions = await caseStore.listContributions(caseId);

  return NextResponse.json({ ...toPublicCase(record), contributions });
}
