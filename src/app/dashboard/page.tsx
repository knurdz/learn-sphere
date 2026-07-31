import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { SetupCard } from "@/components/setup-card";
import { getAuthContext } from "@/lib/supabase/server";
import type { Material, StudySpace } from "@/lib/supabase/database";

export const metadata: Metadata = {
  title: "Dashboard | LearnSphere",
};

export default async function DashboardPage() {
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

  const [{ data: studySpaces }, { data: materials }] = await Promise.all([
    context.supabase
      .from("study_spaces")
      .select("*")
      .order("created_at", { ascending: false }),
    context.supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardShell
      email={context.user.email ?? "Student"}
      studySpaces={(studySpaces ?? []) as StudySpace[]}
      materials={(materials ?? []) as Material[]}
    />
  );
}
