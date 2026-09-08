import type { CaseRecord } from "./types";

/** Public view of a case: everything except the encrypted history blob. */
export type PublicCase = Omit<CaseRecord, "encryptedHistory">;

export function toPublicCase(record: CaseRecord): PublicCase {
  const { caseId, status, createdAt, summary } = record;
  return summary === undefined
    ? { caseId, status, createdAt }
    : { caseId, status, createdAt, summary };
}

export function sortCasesByCreatedAt(cases: PublicCase[]): PublicCase[] {
  return [...cases].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
