import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AvatarPanel } from "@/components/avatar-panel";
import { AppShell } from "@/components/app-shell";
import { SetupCard } from "@/components/setup-card";
import { TutorWorkspace } from "@/components/tutor-workspace";
import { getAuthContext } from "@/lib/supabase/server";
import type { StudySpace } from "@/lib/supabase/database";

export const metadata: Metadata = {
  title: "Tutor | LearnSphere",
};

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{
    studySpaceId?: string;
    prompt?: string;
    returnTo?: string;
  }>;
}) {
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
  const params = await searchParams;
  const spaces = (studySpaces ?? []) as StudySpace[];
  const selectedSpaceId = spaces.some((space) => space.id === params.studySpaceId)
    ? params.studySpaceId
    : spaces[0]?.id;

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f6f8fc] text-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
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
          {params.returnTo === "/feed" && (
            <Link className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800" href="/feed">
              ← Back to your feed
            </Link>
          )}
        </div>
        {spaces.length > 0 ? (
          <>
            <TutorWorkspace
              studySpaces={spaces}
              initialStudySpaceId={selectedSpaceId}
              initialQuestion={params.prompt}
            />
            <div className="mt-6">
              <AvatarPanel studySpaceId={selectedSpaceId ?? spaces[0].id} />
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
    </AppShell>
  );
}
