"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ContributionForm({
  caseId,
  isOpen,
}: {
  caseId: string;
  isOpen: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) {
    return (
      <p className="text-sm leading-6 text-stone-500">
        This case is closed to new contributions.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Something went wrong. Please try again.",
        );
        return;
      }

      setText("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label htmlFor="contribution" className="text-sm font-medium text-stone-700">
          Your perspective
        </label>
        <textarea
          id="contribution"
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm leading-6 text-stone-600">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-fit rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send contribution"}
      </button>
    </form>
  );
}
