export const dynamic = "force-dynamic";

import { caseStore } from "../../lib/cases/store.ts";
import { toPublicCase, sortCasesByCreatedAt } from "../../lib/cases/public-view.ts";
import type { PublicCase } from "../../lib/cases/public-view.ts";

export default async function ShowcasePage() {
  const caseIds = await caseStore.listCasesByStatus("opened");
  const records = await Promise.all(caseIds.map((id) => caseStore.getCase(id)));
  const cases = sortCasesByCreatedAt(
    records
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .map(toPublicCase),
  );

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Conflict as a Bug
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Open cases
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              These cases have been opened to outside perspectives. Read the
              summary and share what you see.
            </p>
          </div>
        </div>

        {cases.length === 0 ? (
          <p className="text-base leading-7 text-stone-600">No open cases yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {cases.map((c) => (
              <li key={c.caseId}>
                <CaseCard c={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function CaseCard({ c }: { c: PublicCase }) {
  const formattedDate = new Date(c.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <p className="break-all font-mono text-xs text-stone-400">{c.caseId}</p>
          <p className="shrink-0 text-xs text-stone-400">{formattedDate}</p>
        </div>
        <p className="text-base leading-7 text-stone-900">
          {c.summary ?? <span className="text-stone-400">Summary pending</span>}
        </p>
      </div>
    </article>
  );
}
