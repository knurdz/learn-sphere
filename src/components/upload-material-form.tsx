"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MAX_UPLOAD_BYTES,
  validateMaterialFile,
} from "@/lib/validation";
import type { StudySpace } from "@/lib/supabase/database";

export function UploadMaterialForm({ studySpaces }: { studySpaces: StudySpace[] }) {
  const [studySpaceId, setStudySpaceId] = useState(studySpaces[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Choose a PDF, DOCX, audio, or MP4 file first.");
      return;
    }

    const validation = validateMaterialFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (!studySpaceId) {
      setError("Create a study space before uploading material.");
      return;
    }

    setIsUploading(true);

    try {
      const createResponse = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: validation.mimeType,
          size: file.size,
          studySpaceId,
        }),
      });
      const created = (await createResponse.json()) as {
        error?: string;
        materialId?: string;
        storagePath?: string;
      };

      if (!createResponse.ok || !created.materialId || !created.storagePath) {
        throw new Error(created.error ?? "Could not prepare the upload.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(created.storagePath, file, {
          contentType: validation.mimeType,
          upsert: false,
        });

      if (uploadError) {
        await fetch("/api/materials/" + created.materialId + "/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "upload_failed" }),
        });
        throw new Error(uploadError.message);
      }

      const completeResponse = await fetch(
        "/api/materials/" + created.materialId + "/status",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "uploaded" }),
        },
      );

      if (!completeResponse.ok) {
        throw new Error("The file uploaded, but its status could not be saved.");
      }

      setMessage("Uploaded successfully. Open the library below to index it.");
      setFile(null);
      const input = document.getElementById("material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      window.setTimeout(() => window.location.reload(), 900);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not upload the material.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6" onSubmit={handleSubmit}>
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Add material
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Bring your course content into one place
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload course content here, then index it from the library to make it
          available to the tutor and study tools.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Study space
          <select
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100"
            value={studySpaceId}
            onChange={(event) => setStudySpaceId(event.target.value)}
            disabled={studySpaces.length === 0 || isUploading}
          >
            {studySpaces.length === 0 ? (
              <option value="">Create a study space first</option>
            ) : (
              studySpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          File
          <input
            id="material-file"
            className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-indigo-300 bg-white px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
            type="file"
            accept=".pdf,.docx,.mp3,.wav,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/mpeg,audio/wav,video/mp4"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={isUploading}
          />
          <span className="mt-2 block text-xs text-slate-500">
            PDF, DOCX, MP3, WAV, or MP4 up to {MAX_UPLOAD_BYTES / (1024 * 1024)} MB.
          </span>
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={isUploading || studySpaces.length === 0}
        >
          {isUploading ? "Uploading securely..." : "Upload material"}
        </button>
      </div>
    </form>
  );
}
