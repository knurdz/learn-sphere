import Link from "next/link";
import { CreateStudySpaceForm } from "@/components/create-study-space-form";
import { IngestMaterialButton } from "@/components/ingest-material-button";
import { UploadMaterialForm } from "@/components/upload-material-form";
import { formatFileSize } from "@/lib/materials";
import type { Material, StudySpace } from "@/lib/supabase/database";

function statusLabel(status: Material["status"]) {
  if (status === "uploaded") return "Uploaded";
  if (status === "processing") return "Indexing";
  if (status === "ready") return "Tutor ready";
  if (status === "error") return "Indexing failed";
  if (status === "upload_failed") return "Upload failed";
  return "Preparing";
}

export function DashboardShell({
  email,
  studySpaces,
  materials,
}: {
  email: string;
  studySpaces: StudySpace[];
  materials: Material[];
}) {
  const spaceNames = new Map(studySpaces.map((space) => [space.id, space.name]));

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
                Student workspace
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>
            <Link
              className="hidden rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 md:inline-flex"
              href="/tutor"
            >
              Open tutor
            </Link>
            <Link
              className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 md:inline-flex"
              href="/study"
            >
              Study tools
            </Link>
            <form action="/auth/signout" method="post">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Your learning base
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Make your study materials easier to return to.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Create a private space for each subject, upload the material you
            already use, index them privately, and turn them into grounded
            tutoring and active practice.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <CreateStudySpaceForm />
          <UploadMaterialForm studySpaces={studySpaces} />
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Your library
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {materials.length === 0 ? "Nothing uploaded yet" : "Saved materials"}
              </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-sm">
              {materials.length} {materials.length === 1 ? "file" : "files"}
            </span>
          </div>

          {materials.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold text-slate-800">Your first study material belongs here.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Upload a lecture note, textbook chapter, or short lesson video
                to start building your workspace.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{material.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {spaceNames.get(material.study_space_id) ?? "Study space"} ·{" "}
                        {formatFileSize(material.size_bytes)}
                      </p>
                    </div>
                    <span
                      className={
                        material.status === "upload_failed" || material.status === "error"
                          ? "shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                          : material.status === "ready"
                            ? "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {statusLabel(material.status)}
                    </span>
                  </div>
                  <p className="mt-5 text-xs leading-5 text-slate-400">
                    {material.status === "ready"
                      ? "Indexed with source metadata for grounded tutoring."
                      : material.ingestion_error ||
                        "Securely stored and ready to prepare for tutoring."}
                  </p>
                  {(material.status === "uploaded" ||
                    material.status === "ready" ||
                    material.status === "error") && (
                    <IngestMaterialButton
                      materialId={material.id}
                      status={material.status}
                    />
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
