import { z } from "zod";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const supportedMaterialMimes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
] as const;

export const materialFileSchema = z.object({
  name: z.string().trim().min(1, "A file name is required").max(120),
  mimeType: z.enum(supportedMaterialMimes),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const materialInputSchema = materialFileSchema.extend({
  studySpaceId: z.string().uuid("Choose a valid study space"),
});

export const studySpaceInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().trim().max(240).optional().default(""),
});

const mimeByExtension: Record<string, (typeof supportedMaterialMimes)[number]> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
};

export function inferMimeType(name: string, browserMimeType: string) {
  if (supportedMaterialMimes.includes(browserMimeType as (typeof supportedMaterialMimes)[number])) {
    return browserMimeType as (typeof supportedMaterialMimes)[number];
  }

  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return mimeByExtension[extension] ?? null;
}

export function validateMaterialFile(file: {
  name: string;
  type: string;
  size: number;
}) {
  const mimeType = inferMimeType(file.name, file.type);
  const parsed = materialFileSchema.safeParse({
    name: file.name,
    mimeType,
    size: file.size,
  });

  if (!parsed.success) {
    return {
      valid: false as const,
      error: parsed.error.issues[0]?.message ?? "This file cannot be uploaded.",
    };
  }

  return { valid: true as const, mimeType: parsed.data.mimeType };
}
