import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LearningFeed } from "@/components/learning-feed";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { SetupCard } from "@/components/setup-card";
import { getAuthContext } from "@/lib/supabase/server";
import type { Material, StudySpace } from "@/lib/supabase/database";

export const metadata: Metadata = {
  title: "Learning feed | LearnSphere",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ studySpaceId?: string }>;
}) {
  const context = await getAuthContext();

  if (!context.configured) {
    return <SetupCard />;
  }
  if (!context.user) redirect("/auth/login");

  const [{ data: studySpaces }, { data: materials }, { data: learningItems }] = await Promise.all([
    context.supabase
      .from("study_spaces")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("study_artifacts")
      .select("id")
      .eq("user_id", context.user.id)
      .in("kind", ["meme", "quiz", "flashcard", "fill_blank", "true_false", "did_you_know"])
      .limit(1),
  ]);
  const params = await searchParams;

  if (!learningItems || learningItems.length === 0) {
    return (
      <AppShell email={context.user.email ?? "Student"} immersive>
        <OnboardingFlow
          studySpaces={(studySpaces ?? []) as StudySpace[]}
          materials={(materials ?? []) as Material[]}
        />
      </AppShell>
    );
  }

  return (
    <LearningFeed
      studySpaces={(studySpaces ?? []) as StudySpace[]}
      initialSpaceId={params.studySpaceId ?? ""}
      email={context.user.email ?? "Student"}
    />
  );
}
