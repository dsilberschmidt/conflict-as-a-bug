"use client";

import { useEffect, useState } from "react";

import { decryptInvitation } from "../../lib/invitations/crypto";
import { parseInvitationLink } from "../../lib/invitations/link";

type InvitationState =
  | { status: "loading" }
  | { status: "ready"; perspective: string }
  | { status: "error" };

export default function InvitationPage() {
  const [invitation, setInvitation] = useState<InvitationState>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;

    async function loadInvitation() {
      try {
        const parsed = parseInvitationLink(window.location.href);
        const decrypted = await decryptInvitation(parsed.envelope, parsed.decryptionKey);

        if (isCurrent) {
          setInvitation({ status: "ready", perspective: decrypted.perspectives.inviter });
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
          <section
            aria-labelledby="received-perspective"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
          >
            <h2 id="received-perspective" className="text-sm font-medium text-stone-700">
              How they see it
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-900">
              {invitation.perspective}
            </p>
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
