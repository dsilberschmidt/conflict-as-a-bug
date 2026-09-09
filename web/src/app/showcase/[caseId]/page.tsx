export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { caseStore } from "../../../lib/cases/store.ts";
import { toPublicCase } from "../../../lib/cases/public-view.ts";
import type { Contribution } from "../../../lib/cases/types.ts";
import { ContributionForm } from "./contribution-form.tsx";
import { SummaryPoller } from "./summary-poller.tsx";
import { BackerFlow } from "./backer-flow.tsx";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const record = await caseStore.getCase(caseId);

  if (!record) notFound();

  const publicCase = toPublicCase(record);
  const contributions = await caseStore.listContributions(caseId);
  const hasSeekerContribution = contributions.some((c) => c.seekingBackers);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-950 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Conflict as a Bug
          </p>
          <Link
            href="/showcase"
            className="w-fit text-sm text-stone-500 hover:text-stone-800"
          >
            ← All cases
          </Link>
          <div className="flex flex-col gap-2">
            <p className="break-all font-mono text-xs text-stone-400">{caseId}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Open case
            </h1>
          </div>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
          <h2 className="text-sm font-medium text-stone-500">Summary</h2>
          <p className="mt-3 text-base leading-7 text-stone-900">
            {publicCase.summary ?? (
              <>
                <span className="animate-pulse text-stone-400">Generating summary…</span>
                <SummaryPoller />
              </>
            )}
          </p>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-base font-semibold text-stone-900">
            {contributions.length === 0
              ? "No contributions yet"
              : contributions.length === 1
                ? "1 contribution"
                : `${contributions.length} contributions`}
          </h2>
          {contributions.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {contributions.map((c) => (
                <li key={c.id}>
                  <ContributionCard contribution={c} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {hasSeekerContribution && record.recipientAddress ? (
          <section className="flex flex-col gap-4">
            <BackerFlow recipientAddress={record.recipientAddress} />
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-stone-900">
            Share your perspective
          </h2>
          <ContributionForm caseId={caseId} isOpen={record.status === "opened"} />
        </section>
      </div>
    </main>
  );
}

function ContributionCard({ contribution }: { contribution: Contribution }) {
  const formattedDate = new Date(contribution.createdAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <article className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-stone-400">{formattedDate}</p>
          {contribution.seekingBackers ? (
            <span className="text-xs font-medium text-amber-700">seeks backing</span>
          ) : null}
        </div>
        <p className="text-base leading-7 text-stone-900">{contribution.text}</p>
      </div>
    </article>
  );
}
