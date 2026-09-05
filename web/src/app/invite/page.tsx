"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addInviteePerspective,
  decryptInvitation,
  encryptInvitation,
  type Invitation,
} from "../../lib/invitations/crypto";
import { createInvitationLink, parseInvitationLink } from "../../lib/invitations/link";

type InvitationState =
  | { status: "loading" }
  | { status: "ready"; invitation: Invitation }
  | { status: "error" };

export default function InvitationPage() {
  const [invitation, setInvitation] = useState<InvitationState>({ status: "loading" });
  const [responseStep, setResponseStep] = useState<"compose" | "review">("compose");
  const [response, setResponse] = useState("");
  const [responseLink, setResponseLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
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

  function handleReviewResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!response.trim()) {
      return;
    }

    setError("");
    setResponseStep("review");
  }

  async function handleCreateResponse() {
    if (invitation.status !== "ready" || invitation.invitation.perspectives.invitee !== undefined) {
      return;
    }

    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      const updatedInvitation = addInviteePerspective(invitation.invitation, response);
      const encryptedInvitation = await encryptInvitation(updatedInvitation);
      setResponseLink(createInvitationLink(window.location.origin, encryptedInvitation));
      setCanShare(typeof navigator.share === "function");
    } catch {
      setError("We couldn't prepare your response. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!responseLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(responseLink);
      setIsCopied(true);
    } catch {
      setError("We couldn't copy the link. Please copy it manually.");
    }
  }

  async function handleShareLink() {
    if (!responseLink || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({
        title: "Conflict as a Bug",
        text: "A response to help you understand a perspective.",
        url: responseLink,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      setError("We couldn't share the link. Please copy it instead.");
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-16 text-stone-950 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
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

        {invitation.status === "ready" ? (
          <div className="flex flex-col gap-6">
            {invitation.invitation.perspectives.invitee === undefined ? (
              <section
                aria-labelledby="received-perspective"
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
              >
                <h2 id="received-perspective" className="text-sm font-medium text-stone-700">
                  How they see it
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                  {invitation.invitation.perspectives.inviter}
                </p>
              </section>
            ) : (
              <div className="flex flex-col gap-4">
                <section className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">A&apos;s perspective</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                    {invitation.invitation.perspectives.inviter}
                  </p>
                </section>
                <section className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                  <h2 className="text-sm font-medium text-stone-700">B&apos;s perspective</h2>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                    {invitation.invitation.perspectives.invitee}
                  </p>
                </section>
              </div>
            )}

            {invitation.invitation.perspectives.invitee === undefined ? (
              responseStep === "compose" ? (
                <form className="flex flex-col gap-6" onSubmit={handleReviewResponse}>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="how-i-see-it" className="text-sm font-medium text-stone-700">
                      How I see it
                    </label>
                    <textarea
                      id="how-i-see-it"
                      name="how-i-see-it"
                      required
                      value={response}
                      onChange={(event) => setResponse(event.target.value)}
                      rows={8}
                      className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
                    >
                      Review your response
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-6">
                  <section className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <h2 className="text-sm font-medium text-stone-700">How I see it</h2>
                    <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                      {response}
                    </p>
                  </section>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setResponseStep("compose")}
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 focus:outline-none focus:ring-4 focus:ring-stone-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateResponse}
                      disabled={isCreating}
                      className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
                    >
                      {isCreating ? "Creating response…" : "Create response"}
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {error ? (
              <p role="alert" className="text-sm leading-6 text-stone-600">
                {error}
              </p>
            ) : null}

            {responseLink ? (
              <section
                aria-live="polite"
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
              >
                <div>
                  <h2 className="text-sm font-medium text-stone-700">Response ready</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Share this link with the other person.
                  </p>
                </div>
                <a
                  href={responseLink}
                  className="break-all text-sm leading-6 text-stone-800 underline decoration-stone-300 underline-offset-4"
                >
                  {responseLink}
                </a>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 focus:outline-none focus:ring-4 focus:ring-stone-200"
                  >
                    {isCopied ? "Copied" : "Copy link"}
                  </button>
                  {canShare ? (
                    <button
                      type="button"
                      onClick={handleShareLink}
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 focus:outline-none focus:ring-4 focus:ring-stone-200"
                    >
                      Share
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
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
