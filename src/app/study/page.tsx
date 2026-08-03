import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
    <AppShell>
      <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            LearnSphere study tools
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Turn indexed material into practice.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Create avatar-led video lessons and timestamped video quizzes from
            your indexed materials.
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
    </AppShell>
  );
}
