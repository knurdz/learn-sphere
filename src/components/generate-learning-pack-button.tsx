"use client";

import { useState } from "react";

type GenerationResponse = {
  created?: number;
  skipped?: number;
  atomCount?: number;
  failures?: Array<{ itemKey: string; detail: string }>;
  error?: string;
};

export function GenerateLearningPackButton({
  studySpaceId,
  materialId,
}: {
  studySpaceId: string;
  materialId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/learning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studySpaceId, materialId }),
      });
      const body = (await response.json()) as GenerationResponse;
      if (!response.ok) throw new Error(body.error ?? "Generation failed.");
      setResult(body);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={generate}
          disabled={busy}
        >
          {busy ? "Creating learning pack..." : "Create learning feed"}
        </button>
        <a
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          href={`/feed?studySpaceId=${encodeURIComponent(studySpaceId)}`}
        >
          Open feed
        </a>
      </div>
      {result && (
        <p className="mt-2 text-xs leading-5 text-emerald-700" role="status">
          Created {result.created ?? 0} learning items from {result.atomCount ?? 0} concepts
          {(result.skipped ?? 0) > 0 ? ` · ${result.skipped} already existed` : ""}.
          {(result.failures?.length ?? 0) > 0
            ? ` ${result.failures?.length} item(s) need a retry.`
            : ""}
        </p>
      )}
      {error && <p className="mt-2 text-xs leading-5 text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
