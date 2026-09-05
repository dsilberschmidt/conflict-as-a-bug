"use client";

import { FormEvent, useState } from "react";

import { createInitialInvitation, encryptInvitation } from "../lib/invitations/crypto";
import { createInvitationLink } from "../lib/invitations/link";

export default function Home() {
  const [step, setStep] = useState<"compose" | "review">("compose");
  const [perspective, setPerspective] = useState("");
  const [invitationLink, setInvitationLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [linkMessage, setLinkMessage] = useState("Invitation ready");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!perspective.trim()) {
      return;
    }

    setStep("review");
  }

  async function handleCreateInvitation() {
    setError("");
    setIsCopied(false);
    setIsCreating(true);

    try {
      const invitation = await encryptInvitation(createInitialInvitation(perspective));
      const link = createInvitationLink(window.location.origin, invitation);
      setInvitationLink(link);

      if (typeof navigator.share === "function") {
        setCanShare(true);
        try {
          await navigator.share({
            title: "Conflict as a Bug",
            text: "An invitation to understand a perspective.",
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
    } catch {
      setError("We couldn't prepare your invitation. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!invitationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invitationLink);
      setIsCopied(true);
    } catch {
      setError("We couldn't copy the link. Please copy it manually.");
    }
  }

  async function handleShareLink() {
    if (!invitationLink || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({
        title: "Conflict as a Bug",
        text: "An invitation to understand a perspective.",
        url: invitationLink,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      setError("We couldn't share the link. Please copy it instead.");
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-stone-950 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Conflict as a Bug
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {step === "compose"
                ? "Start with how you see it."
                : "Review your invitation"}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              {step === "compose"
                ? "Write what you would like the other person to understand."
                : "This is what the other person will receive."}
            </p>
          </div>
        </div>

        {step === "compose" ? (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="how-i-see-it"
                className="text-sm font-medium text-stone-700"
              >
                How I see it
              </label>
              <textarea
                id="how-i-see-it"
                name="how-i-see-it"
                required
                value={perspective}
                onChange={(event) => setPerspective(event.target.value)}
                rows={8}
                className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
              />
            </div>

            <div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
              >
                Prepare invitation
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            <section
              aria-labelledby="reviewed-perspective"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
            >
              <h2
                id="reviewed-perspective"
                className="text-sm font-medium text-stone-700"
              >
                How I see it
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
                {perspective}
              </p>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setStep("compose")}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-100 focus:outline-none focus:ring-4 focus:ring-stone-200"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleCreateInvitation}
                disabled={isCreating}
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
              >
                {isCreating ? "Creating invitation…" : "Create invitation"}
              </button>
            </div>

            {error ? (
              <p role="alert" className="text-sm leading-6 text-stone-600">
                {error}
              </p>
            ) : null}

            {invitationLink ? (
              <section
                aria-live="polite"
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
              >
                <div>
                  <h2 className="text-sm font-medium text-stone-700">{linkMessage}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Share this link with the other person.
                  </p>
                </div>
                <a
                  href={invitationLink}
                  className="break-all text-sm leading-6 text-stone-800 underline decoration-stone-300 underline-offset-4"
                >
                  {invitationLink}
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
                      Share invitation
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
