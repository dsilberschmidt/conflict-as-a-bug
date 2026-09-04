export default function Home() {
  return (
    <main className="min-h-screen bg-stone-100 px-6 py-16 text-stone-950 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Conflict as a Bug
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Describe the conflict.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-600">
              Your perspective will become the beginning of a shared case.
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="conflict-description"
              className="text-sm font-medium text-stone-700"
            >
              What happened?
            </label>
            <textarea
              id="conflict-description"
              name="conflict-description"
              rows={8}
              className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base leading-7 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-200"
            />
          </div>

          <div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-4 focus:ring-stone-300"
            >
              Create case
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
