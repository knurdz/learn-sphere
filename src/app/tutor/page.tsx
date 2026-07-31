import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AvatarPanel } from "@/components/avatar-panel";
import { SetupCard } from "@/components/setup-card";
import { TutorWorkspace } from "@/components/tutor-workspace";
import { getAuthContext } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tutor | LearnSphere",
};

export default async function TutorPage() {
  const context = await getAuthContext();

  if (!context.configured) {
    return (
      <main className="min-h-screen bg-[#f6f8fc] px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <SetupCard />
        </div>
      </main>
    );
  }

  if (!context.user) {
    redirect("/auth/login");
  }

  const { data: studySpaces } = await context.supabase
    .from("study_spaces")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
              L
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">LearnSphere</span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">
                Grounded tutor
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/study"
              className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Study tools
            </Link>
            <form action="/auth/signout" method="post">
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LearnSphere tutor
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Ask, verify, and keep moving.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Choose a study space, ask a question, and get a source-aware
            explanation from your indexed materials.
          </p>
        </div>
        {studySpaces && studySpaces.length > 0 ? (
          <>
            <TutorWorkspace studySpaces={studySpaces} />
            <div className="mt-6">
              <AvatarPanel />
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">Create a study space first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add a subject and upload material from your dashboard before
              opening a grounded tutor session.
            </p>
            <Link className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white" href="/dashboard">
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
