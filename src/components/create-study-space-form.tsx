"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudySpace } from "@/lib/supabase/database";

export function CreateStudySpaceForm({
  onCreated,
}: {
  onCreated?: (studySpace: StudySpace) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/study-spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not create the study space.");
      }

      setName("");
      setDescription("");
      const studySpace = (result as { studySpace?: StudySpace }).studySpace;
      if (studySpace && onCreated) {
        onCreated(studySpace);
      } else {
        router.refresh();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create the study space.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
          New study space
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Organize one subject at a time
        </h2>
      </div>

      <div className="space-y-4">
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Data Structures"
          aria-label="Study space name"
          required
          minLength={2}
          maxLength={80}
        />
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional notes about this subject"
          aria-label="Study space description"
          maxLength={240}
        />
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        <button
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create study space"}
        </button>
      </div>
    </form>
  );
}
