import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8fc] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
            L
          </span>
          <span className="text-lg font-semibold tracking-tight">LearnSphere</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link className="px-3 py-2 text-slate-600 hover:text-slate-950" href="/auth/login">
            Sign in
          </Link>
          <Link className="rounded-xl bg-slate-950 px-4 py-2.5 text-white transition hover:bg-indigo-700" href="/auth/signup">
            Create account
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div className="max-w-3xl self-center">
          <p className="mb-6 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            A focused home for the way you already study
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-7xl">
            Learn with more clarity.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Keep your notes, readings, audio, and lesson videos organized in
            private study spaces, ready for grounded help when you need it.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="rounded-xl bg-indigo-600 px-5 py-3.5 text-center font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              href="/auth/signup"
            >
              Create student account
            </Link>
            <Link
              className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-center font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              href="/auth/login"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">Private</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Your own learning space</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Organized</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">One subject at a time</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Grounded</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Built for source-aware help</p>
            </div>
          </div>
        </div>

        <div className="relative self-center">
          <div className="absolute -inset-8 rounded-[3rem] bg-indigo-200/30 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-indigo-100 backdrop-blur">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">
                    Today&apos;s focus
                  </p>
                  <p className="mt-2 text-xl font-semibold">Data Structures</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-200">3 files</span>
              </div>
              <div className="mt-8 space-y-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold">PDF</span>
                    <div>
                      <p className="text-sm font-semibold">Trees and Graphs</p>
                      <p className="mt-1 text-xs text-slate-400">Uploaded just now</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold">DOC</span>
                    <div>
                      <p className="text-sm font-semibold">Week 04 lecture notes</p>
                      <p className="mt-1 text-xs text-slate-400">Ready for ingestion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your next step</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">Ask your materials anything</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
