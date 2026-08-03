"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MAX_UPLOAD_BYTES,
  validateMaterialFile,
} from "@/lib/validation";
import type { Material, StudySpace } from "@/lib/supabase/database";

export function UploadMaterialForm({
  studySpaces,
  onUploaded,
  compact = false,
}: {
  studySpaces: StudySpace[];
  onUploaded?: (material: Material) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [studySpaceId, setStudySpaceId] = useState(studySpaces[0]?.id ?? "");
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const sourceFile =
      mode === "text"
        ? new File([text.trim()], "pasted-notes.txt", { type: "text/plain" })
        : file;

    if (!sourceFile || (mode === "text" && !text.trim())) {
      setError(
        mode === "text"
          ? "Paste some learning material first."
          : "Choose a PDF, DOCX, audio, or MP4 file first.",
      );
      return;
    }

    const validation = validateMaterialFile(sourceFile);
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
          name: sourceFile.name,
          mimeType: validation.mimeType,
          size: sourceFile.size,
          studySpaceId,
        }),
      });
      const created = (await createResponse.json()) as {
        error?: string;
        materialId?: string;
        storagePath?: string;
        material?: Material;
      };

      if (!createResponse.ok || !created.materialId || !created.storagePath) {
        throw new Error(created.error ?? "Could not prepare the upload.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(created.storagePath, sourceFile, {
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

      setMessage("Uploaded successfully. Your material is ready for the next step.");
      setFile(null);
      setText("");
      const input = document.getElementById("material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      if (created.material && onUploaded) {
        onUploaded(created.material);
      } else {
        router.refresh();
      }
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
    <form id={compact ? undefined : "add-material"} className={`rounded-3xl border border-indigo-100 bg-indigo-50/60 p-6 ${compact ? "shadow-xl shadow-indigo-100/30" : ""}`} onSubmit={handleSubmit}>
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Add material
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          {compact ? "Add your first learning material" : "Bring your course content into one place"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {compact
            ? "Upload a file or paste notes. We will turn it into a private learning feed."
            : "Upload course content here, then index it from the library to make it available to the tutor and study tools."}
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

        <div className="flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm" role="group" aria-label="Material input type">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === "file" ? "bg-indigo-100 text-indigo-700" : "text-slate-500"}`}
            onClick={() => setMode("file")}
            disabled={isUploading}
          >
            Upload file
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === "text" ? "bg-indigo-100 text-indigo-700" : "text-slate-500"}`}
            onClick={() => setMode("text")}
            disabled={isUploading}
          >
            Paste notes
          </button>
        </div>

        {mode === "file" ? (
          <label className="block text-sm font-medium text-slate-700">
            File
            <input
              id="material-file"
              className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-indigo-300 bg-white px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
              type="file"
              accept=".pdf,.docx,.txt,.mp3,.wav,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/mpeg,audio/wav,video/mp4"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isUploading}
            />
            <span className="mt-2 block text-xs text-slate-500">
              PDF, DOCX, TXT, MP3, WAV, or MP4 up to {MAX_UPLOAD_BYTES / (1024 * 1024)} MB.
            </span>
          </label>
        ) : (
          <label className="block text-sm font-medium text-slate-700">
            Learning notes
            <textarea
              className="mt-2 min-h-40 w-full resize-y rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste lecture notes, a textbook excerpt, or a topic explanation..."
              disabled={isUploading}
            />
          </label>
        )}

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
