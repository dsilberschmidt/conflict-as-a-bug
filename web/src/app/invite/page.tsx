"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addInviteePerspective,
  decryptInvitation,
  encryptInvitation,
  isMutualUnderstandingConfirmed,
  reviewParaphrase,
  submitParaphrase,
  type Invitation,
  type Participant,
} from "../../lib/invitations/crypto";
import { createInvitationLink, parseInvitationLink } from "../../lib/invitations/link";

type InvitationState =
  | { status: "loading" }
  | { status: "ready"; invitation: Invitation }
  | { status: "error" };

type ReflectionStep = "read" | "write" | "compare";

type Workflow =
  | { kind: "reflect"; author: Participant; source: string; clarification?: string }
  | { kind: "review"; reviewer: Participant; source: string; paraphrase: string }
  | { kind: "confirmed" };

function getWorkflow(invitation: Invitation): Workflow {
  if (isMutualUnderstandingConfirmed(invitation)) {
    return { kind: "confirmed" };
  }

  const inviterParaphrase = invitation.paraphrases.inviter;

  if (
    inviterParaphrase === undefined ||
    inviterParaphrase.status === "clarificationRequested"
  ) {
    return {
      kind: "reflect",
      author: "inviter",
      source: invitation.perspectives.invitee!,
      clarification: inviterParaphrase?.clarification,
    };
  }

  if (inviterParaphrase.status === "pending") {
    return {
      kind: "review",
      reviewer: "invitee",
      source: invitation.perspectives.invitee!,
      paraphrase: inviterParaphrase.text,
    };
  }

  const inviteeParaphrase = invitation.paraphrases.invitee;

  if (
    inviteeParaphrase === undefined ||
    inviteeParaphrase.status === "clarificationRequested"
  ) {
    return {
      kind: "reflect",
      author: "invitee",
      source: invitation.perspectives.inviter,
      clarification: inviteeParaphrase?.clarification,
    };
  }

  return {
    kind: "review",
    reviewer: "inviter",
    source: invitation.perspectives.inviter,
    paraphrase: inviteeParaphrase.text,
  };
}

export default function InvitationPage() {
  const [invitation, setInvitation] = useState<InvitationState>({ status: "loading" });
  const [responseStep, setResponseStep] = useState<"compose" | "review">("compose");
  const [reflectionStep, setReflectionStep] = useState<ReflectionStep>("read");
  const [response, setResponse] = useState("");
  const [paraphrase, setParaphrase] = useState("");
  const [clarification, setClarification] = useState("");
  const [acceptedInvitation, setAcceptedInvitation] = useState<Invitation | null>(null);
  const [updatedLink, setUpdatedLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share reflection");
  const [linkMessage, setLinkMessage] = useState("Link ready");
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadInvitation() {
      try {
        const parsed = parseInvitationLink(window.location.href);
        const decrypted = await decryptInvitation(parsed.envelope, parsed.decryptionKey);

        if (isCurrent) {
          setInvitation({ status: "ready", invitation: decrypted });
        }
      } catch {
        if (isCurrent) {
          setInvitation({ status: "error" });
        }
      }
    }

    void loadInvitation();

    return () => {
      isCurrent = false;
    };
  }, []);

  async function createLink(updatedInvitation: Invitation, nextShareLabel: string) {
    const encryptedInvitation = await encryptInvitation(updatedInvitation);
    const link = createInvitationLink(window.location.origin, encryptedInvitation);
    setUpdatedLink(link);
    setShareLabel(nextShareLabel);
    setLinkMessage("Link ready");

    if (typeof navigator.share === "function") {
      setCanShare(true);

      try {
        await navigator.share({
          title: "Conflict as a Bug",
          text: "A new step toward understanding.",
          url: link,
        });
      } catch (shareError) {
        if (!(shareError instanceof DOMException && shareError.name === "AbortError")) {
          setError("We couldn't share the link. You can copy it instead.");
        }
      }
    } else {
      setCanShare(false);

      try {
        await navigator.clipboard.writeText(link);
        setIsCopied(true);
        setLinkMessage("Link copied");
      } catch {
        setError("We couldn't copy the link. Please copy it manually.");
      }
    }
  }

  function handleReviewResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!response.trim()) {
      return;
    }

    setError("");
    setResponseStep("review");
  }

  function handleCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!paraphrase.trim()) {
      return;
    }

    setError("");
    setReflectionStep("compare");
  }

  async function handleCreateResponse() {
    if (invitation.status !== "ready" || invitation.invitation.perspectives.invitee !== undefined) {
      return;
    }

    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      await createLink(addInviteePerspective(invitation.invitation, response), "Share response");
    } catch {
      setError("We couldn't prepare your response. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateParaphrase(author: Participant) {
    if (invitation.status !== "ready") {
      return;
    }

    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      await createLink(submitParaphrase(invitation.invitation, author, paraphrase), "Share reflection");
    } catch {
      setError("We couldn't prepare your reflection. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateAcceptedReflection() {
    if (acceptedInvitation === null) {
      return;
    }

    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      await createLink(
        submitParaphrase(acceptedInvitation, "invitee", paraphrase),
        "Share reflection",
      );
    } catch {
      setError("We couldn't prepare your reflection. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleReviewParaphrase(reviewer: Participant, accepted: boolean) {
    if (invitation.status !== "ready") {
      return;
    }

    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      const reviewedInvitation = reviewParaphrase(
        invitation.invitation,
        reviewer,
        accepted,
        accepted ? undefined : clarification,
      );

      if (accepted && reviewer === "invitee") {
        setAcceptedInvitation(reviewedInvitation);
        setParaphrase("");
        setReflectionStep("read");
        return;
      }

      await createLink(
        reviewedInvitation,
        accepted ? "Share confirmation" : "Share clarification",
      );
    } catch {
      setError(
        accepted
          ? "We couldn't update this reflection. Please try again."
          : "Please add a clarification before sending it.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!updatedLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(updatedLink);
      setIsCopied(true);
    } catch {
      setError("We couldn't copy the link. Please copy it manually.");
    }
  }

  async function handleShareLink() {
    if (!updatedLink || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({
        title: "Conflict as a Bug",
        text: "A new step toward understanding.",
        url: updatedLink,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      setError("We couldn't share the link. Please copy it instead.");
    }
  }

  const workflow = invitation.status === "ready" && invitation.invitation.perspectives.invitee !== undefined
    ? getWorkflow(invitation.invitation)
    : null;
  const isBScreen =
    invitation.status === "ready" &&
    (invitation.invitation.perspectives.invitee === undefined ||
      (workflow?.kind === "reflect" && workflow.author === "invitee") ||
      (workflow?.kind === "review" && workflow.reviewer === "invitee"));

  return (
    <main className={`min-h-screen px-6 py-16 text-stone-950 sm:px-10 lg:px-12 ${isBScreen ? "bg-stone-100" : "bg-white"}`}>
      <div className={`mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-stone-200 p-8 shadow-sm sm:p-10 ${isBScreen ? "bg-stone-50" : "bg-white"}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Conflict as a Bug
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              An invitation to understand
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              Take a moment to read what the other person would like you to understand.
            </p>
          </div>
        </div>

        {invitation.status === "loading" ? (
          <p aria-live="polite" className="text-base leading-7 text-stone-600">
            Opening invitation…
          </p>
        ) : null}

        {invitation.status === "ready" && invitation.invitation.perspectives.invitee === undefined ? (
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">A · How they see it</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                {invitation.invitation.perspectives.inviter}
              </p>
            </section>

            {responseStep === "compose" ? (
              <form className="flex flex-col gap-6" onSubmit={handleReviewResponse}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="how-i-see-it" className="text-sm font-medium text-stone-700">
                    How I see it
                  </label>
                  <textarea
                    id="how-i-see-it"
                    required
                    value={response}
                    onChange={(event) => setResponse(event.target.value)}
                    rows={8}
                    className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
                  />
                </div>
                <button type="submit" className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                  Continue
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">Before you share</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Read it once more. You can edit it or create the link.</p>
                </div>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">B · How I see it</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{response}</p>
                </section>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setResponseStep("compose")} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">
                    Edit
                  </button>
                  <button type="button" onClick={handleCreateResponse} disabled={isCreating} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                    {isCreating ? "Creating response…" : "Create response"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {invitation.status === "ready" && workflow?.kind === "reflect" ? (
          <div className="flex flex-col gap-6">
            {reflectionStep === "read" ? (
              <>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">
                    {workflow.author === "inviter" ? "Read B’s perspective" : "Read A’s perspective"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Read it at your own pace.</p>
                </div>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">{workflow.author === "inviter" ? "B · How they see it" : "A · How they see it"}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{workflow.source}</p>
                </section>
                {workflow.clarification ? (
                  <p className="text-sm leading-6 text-stone-600">Clarification: {workflow.clarification}</p>
                ) : null}
                <button type="button" onClick={() => setReflectionStep("write")} className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                  I&apos;m ready to reflect
                </button>
              </>
            ) : null}

            {reflectionStep === "write" ? (
              <form className="flex flex-col gap-6" onSubmit={handleCompare}>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">Reflect what you understood</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Write in your own words.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="what-i-understood" className="text-sm font-medium text-stone-700">
                    {workflow.author === "invitee"
                      ? "What I understood about A’s perspective"
                      : "What I understood about B’s perspective"}
                  </label>
                  <textarea
                    id="what-i-understood"
                    required
                    value={paraphrase}
                    onChange={(event) => setParaphrase(event.target.value)}
                    rows={8}
                    className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
                  />
                </div>
                <button type="submit" className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                  Compare
                </button>
              </form>
            ) : null}

            {reflectionStep === "compare" ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">
                    {workflow.author === "inviter" ? "Review your understanding of B" : "Review your understanding of A"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Compare both texts before sharing.</p>
                </div>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">{workflow.author === "inviter" ? "B · How they see it" : "A · How they see it"}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{workflow.source}</p>
                </section>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">{workflow.author === "inviter" ? "A · What I understood" : "B · What I understood"}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{paraphrase}</p>
                </section>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setReflectionStep("write")} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleCreateParaphrase(workflow.author)} disabled={isCreating} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                    {isCreating ? "Creating link…" : "Create link"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {invitation.status === "ready" && workflow?.kind === "review" && workflow.reviewer === "invitee" && acceptedInvitation !== null ? (
          <div className="flex flex-col gap-6">
            {reflectionStep === "read" ? (
              <>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">Read A’s perspective</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Read it at your own pace.</p>
                </div>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">A · How they see it</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.perspectives.inviter}</p>
                </section>
                <button type="button" onClick={() => setReflectionStep("write")} className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                  I&apos;m ready to reflect
                </button>
              </>
            ) : null}
            {reflectionStep === "write" ? (
              <form className="flex flex-col gap-6" onSubmit={handleCompare}>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">Reflect what you understood</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Write in your own words.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="what-i-understood" className="text-sm font-medium text-stone-700">
                    What I understood about A’s perspective
                  </label>
                  <textarea
                    id="what-i-understood"
                    required
                    value={paraphrase}
                    onChange={(event) => setParaphrase(event.target.value)}
                    rows={8}
                    className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
                  />
                </div>
                <button type="submit" className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                  Compare
                </button>
              </form>
            ) : null}
            {reflectionStep === "compare" ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-balance">Review your understanding of A</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">Compare both texts before sharing.</p>
                </div>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">A · How they see it</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.perspectives.inviter}</p>
                </section>
                <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">B · What I understood</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{paraphrase}</p>
                </section>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setReflectionStep("write")} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">
                    Edit
                  </button>
                  <button type="button" onClick={handleCreateAcceptedReflection} disabled={isCreating} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                    {isCreating ? "Creating link…" : "Create link"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {invitation.status === "ready" && workflow?.kind === "review" && !(workflow.reviewer === "invitee" && acceptedInvitation !== null) ? (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-balance">
                {workflow.reviewer === "inviter" ? "Did B understand you?" : "Did A understand you?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">Accept it or ask for a clarification.</p>
            </div>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">{workflow.reviewer === "inviter" ? "A · How I see it" : "B · How I see it"}</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{workflow.source}</p>
            </section>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">{workflow.reviewer === "inviter" ? "B · What they understood" : "A · What they understood"}</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{workflow.paraphrase}</p>
            </section>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => handleReviewParaphrase(workflow.reviewer, true)} disabled={isCreating} className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white">
                Yes, that reflects what I meant
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="clarification" className="text-sm font-medium text-stone-700">What needs clarification</label>
              <textarea id="clarification" value={clarification} onChange={(event) => setClarification(event.target.value)} rows={4} className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200" />
              <button type="button" onClick={() => handleReviewParaphrase(workflow.reviewer, false)} disabled={isCreating} className="inline-flex w-fit rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">
                I need to clarify
              </button>
            </div>
          </div>
        ) : null}

        {invitation.status === "ready" && workflow?.kind === "confirmed" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-balance">Mutual understanding confirmed</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">Both reflections were accepted.</p>
            </div>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">A · Perspective</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.perspectives.inviter}</p>
            </section>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">B · What I understood about A</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.paraphrases.invitee?.text}</p>
              {invitation.invitation.paraphrases.invitee?.clarification ? (
                <p className="mt-3 text-sm leading-6 text-stone-700">Clarification: {invitation.invitation.paraphrases.invitee.clarification}</p>
              ) : null}
            </section>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">B · Perspective</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.perspectives.invitee}</p>
            </section>
            <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-stone-700">A · What I understood about B</h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">{invitation.invitation.paraphrases.inviter?.text}</p>
              {invitation.invitation.paraphrases.inviter?.clarification ? (
                <p className="mt-3 text-sm leading-6 text-stone-700">Clarification: {invitation.invitation.paraphrases.inviter.clarification}</p>
              ) : null}
            </section>
          </div>
        ) : null}

        {error ? <p role="alert" className="text-sm leading-6 text-stone-600">{error}</p> : null}

        {updatedLink ? (
          <section aria-live="polite" className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
            <div>
              <h2 className="text-sm font-medium text-stone-700">{linkMessage}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">Share this link with the other person.</p>
            </div>
            <a href={updatedLink} className="break-all text-sm leading-6 text-stone-800 underline decoration-stone-300 underline-offset-4">{updatedLink}</a>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleCopyLink} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">
                {isCopied ? "Copied" : "Copy link"}
              </button>
              {canShare ? (
                <button type="button" onClick={handleShareLink} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800">{shareLabel}</button>
              ) : null}
            </div>
          </section>
        ) : null}

        {invitation.status === "error" ? (
          <p role="alert" className="max-w-2xl text-base leading-7 text-stone-600">
            This invitation link isn&apos;t valid or may have been changed. Please ask the sender for a new link.
          </p>
        ) : null}
      </div>
    </main>
  );
}
