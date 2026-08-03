"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CreateStudySpaceForm } from "@/components/create-study-space-form";
import { UploadMaterialForm } from "@/components/upload-material-form";
import type { Material, StudySpace } from "@/lib/supabase/database";
import { getOnboardingStep } from "@/lib/onboarding";

export function OnboardingFlow({
  studySpaces: initialStudySpaces,
  materials: initialMaterials,
}: {
  studySpaces: StudySpace[];
  materials: Material[];
}) {
  const router = useRouter();
  const [studySpaces, setStudySpaces] = useState(initialStudySpaces);
  const [material, setMaterial] = useState<Material | null>(initialMaterials[0] ?? null);
  const [step, setStep] = useState(getOnboardingStep(initialStudySpaces, initialMaterials));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const selectedSpace = useMemo(
    () => studySpaces.find((space) => space.id === material?.study_space_id) ?? studySpaces[0],
    [material?.study_space_id, studySpaces],
  );

  async function prepareLearningFeed() {
    if (!material || !selectedSpace || busy) return;

    setBusy(true);
    setError("");
    setStatus("Getting your material ready...");

    try {
      let readyMaterial = material;

      if (material.status !== "ready") {
        if (material.status === "processing") {
          throw new Error("This material is already being indexed. Refresh in a moment to continue.");
        }

        const ingestResponse = await fetch(`/api/materials/${material.id}/ingest`, {
          method: "POST",
        });
        const ingestBody = (await ingestResponse.json()) as {
          error?: string;
          material?: Material;
        };
        if (!ingestResponse.ok || !ingestBody.material) {
          throw new Error(ingestBody.error ?? "We could not prepare that material.");
        }
        readyMaterial = ingestBody.material;
        setMaterial(readyMaterial);
      }

      setStatus("Creating your first learning cards...");
      const generateResponse = await fetch("/api/learning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySpaceId: selectedSpace.id,
          materialId: readyMaterial.id,
        }),
      });
      const generateBody = (await generateResponse.json()) as { error?: string };
      if (!generateResponse.ok) {
        throw new Error(generateBody.error ?? "We could not create your learning feed.");
      }

      setStatus("Your feed is ready.");
      router.push(`/feed?studySpaceId=${encodeURIComponent(selectedSpace.id)}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "We could not prepare your feed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent_38%),#080b16] px-5 py-10 text-white sm:px-8 lg:px-10 lg:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Your private learning feed
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Turn one subject into your next scroll.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
            Set up a subject once. Learn in short bursts, answer as you go, and ask your tutor whenever a card needs more context.
          </p>
          <Link className="mt-7 inline-flex text-sm font-semibold text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-white" href="/dashboard">
            Skip to library
          </Link>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-indigo-950/40 backdrop-blur sm:p-8" aria-labelledby="setup-heading">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Quick setup</p>
              <h2 id="setup-heading" className="mt-2 text-2xl font-semibold">Let&apos;s build your first feed</h2>
            </div>
            <span className="text-sm font-semibold text-slate-400">{step} of 3</span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Setup progress">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-indigo-400" : "bg-white/10"}`} />
            ))}
          </div>

          <div className="mt-8">
            {step === 1 ? (
              <div>
                <p className="text-sm font-semibold text-indigo-200">Step 1 · Choose a subject</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Keep each subject focused so your feed and tutor stay useful.</p>
                <div className="mt-5 rounded-3xl bg-white p-1 text-slate-950">
                  <CreateStudySpaceForm
                    onCreated={(studySpace) => {
                      setStudySpaces((current) => [studySpace, ...current]);
                      setStep(2);
                    }}
                  />
                </div>
              </div>
            ) : step === 2 ? (
              <div>
                <p className="text-sm font-semibold text-indigo-200">Step 2 · Add material</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Upload a lecture, reading, audio lesson, or paste notes.</p>
                <div className="mt-5">
                  <UploadMaterialForm
                    studySpaces={studySpaces}
                    compact
                    onUploaded={(uploadedMaterial) => {
                      setMaterial(uploadedMaterial);
                      setStep(3);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-indigo-200">Step 3 · Make it learnable</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">We&apos;ll index your material and create a mix of memes, recall cards, and quick checks.</p>
                <div className="mt-5 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-lg font-bold text-indigo-200">3</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{material?.name ?? "Your material"}</p>
                      <p className="mt-1 text-sm text-slate-400">{selectedSpace?.name ?? "Your subject"}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["01", "Index", "Grounded context"],
                      ["02", "Generate", "Short learning cards"],
                      ["03", "Start", "Your first scroll"],
                    ].map(([number, title, description]) => (
                      <div key={number} className="rounded-2xl bg-white/[0.06] p-3">
                        <span className="text-xs font-bold text-indigo-300">{number}</span>
                        <p className="mt-2 text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                      </div>
                    ))}
                  </div>
                  {status && <p className="mt-5 text-sm text-emerald-300" role="status">{status}</p>}
                  {error && <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm leading-6 text-rose-200" role="alert">{error}</p>}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => void prepareLearningFeed()} disabled={busy || !material || !selectedSpace}>
                      {busy ? "Preparing your feed..." : "Create my learning feed"}
                    </button>
                    <button className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/30 hover:text-white" type="button" onClick={() => router.refresh()} disabled={busy}>
                      Refresh status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
