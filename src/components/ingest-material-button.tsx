"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IngestMaterialButton({
  materialId,
  status,
  onIndexed,
}: {
  materialId: string;
  status: "uploaded" | "ready" | "error";
  onIndexed?: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/materials/" + materialId + "/ingest", {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Indexing failed.");
      }

      if (onIndexed) {
        onIndexed();
      } else {
        router.refresh();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Indexing failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        className="rounded-xl bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Indexing..."
          : status === "ready"
            ? "Re-index material"
            : "Prepare for tutor"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
