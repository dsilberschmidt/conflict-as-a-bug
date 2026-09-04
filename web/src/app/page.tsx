"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [step, setStep] = useState<"compose" | "review">("compose");
  const [perspective, setPerspective] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!perspective.trim()) {
      return;
    }

    setStep("review");
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
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4"
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
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
              >
                Create invitation
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
