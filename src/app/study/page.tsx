import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupCard } from "@/components/setup-card";
import { StudyToolsWorkspace } from "@/components/study-tools-workspace";
import { getAuthContext } from "@/lib/supabase/server";
import type { StudySpace } from "@/lib/supabase/database";

export const metadata: Metadata = {
  title: "Study tools | LearnSphere",
};

export default async function StudyPage() {
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

  if (!context.user) redirect("/auth/login");

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
                Study tools
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/tutor"
              className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Open tutor
            </Link>
            <form action="/auth/signout" method="post">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LearnSphere study tools
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Turn indexed material into practice.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Create grounded guides, flashcards, practice tests, and video quizzes,
            then keep your quiz results as learning progress.
          </p>
        </div>
        {studySpaces && studySpaces.length > 0 ? (
          <StudyToolsWorkspace studySpaces={studySpaces as StudySpace[]} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">Create a study space first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create a space and index at least one material from your dashboard before generating tools.
            </p>
            <Link
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
              href="/dashboard"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
