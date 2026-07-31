import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Material } from "@/lib/supabase/database";
import { embedTexts, transcribeFile } from "@/lib/providers/openai";

export type SourceSegment = {
  text: string;
  pageNumber: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
};

export type IngestionChunk = SourceSegment & {
  chunkIndex: number;
};

export function chunkSourceText(
  source: SourceSegment,
  startIndex: number,
  maxCharacters = 1400,
  overlap = 180,
) {
  const cleanText = source.text.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    return [];
  }

  const chunks: IngestionChunk[] = [];
  let offset = 0;
  let chunkIndex = startIndex;

  while (offset < cleanText.length) {
    const end = Math.min(cleanText.length, offset + maxCharacters);
    const content = cleanText.slice(offset, end).trim();
    if (content) {
      chunks.push({
        ...source,
        text: content,
        chunkIndex,
      });
      chunkIndex += 1;
    }

    if (end >= cleanText.length) {
      break;
    }

    offset = Math.max(offset + 1, end - overlap);
  }

  return chunks;
}

async function extractPdfSegments(buffer: Buffer): Promise<SourceSegment[]> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  return result.pages
    .map((page) => ({
      text: page.text,
      pageNumber: page.num,
      startSeconds: null,
      endSeconds: null,
    }))
    .filter((page) => page.text.trim().length > 0);
}

async function extractDocxSegments(buffer: Buffer): Promise<SourceSegment[]> {
  const result = await mammoth.extractRawText({ buffer });
  return [
    {
      text: result.value,
      pageNumber: null,
      startSeconds: null,
      endSeconds: null,
    },
  ];
}

async function extractMediaSegments(
  material: Material,
  buffer: Buffer,
): Promise<SourceSegment[]> {
  const segments = await transcribeFile({
    buffer,
    fileName: material.name,
    mimeType: material.mime_type,
  });

  return segments.map((segment) => ({
    text: segment.text,
    pageNumber: null,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
  }));
}

async function extractSegments(material: Material, buffer: Buffer) {
  if (material.mime_type === "application/pdf") {
    return extractPdfSegments(buffer);
  }

  if (
    material.mime_type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxSegments(buffer);
  }

  return extractMediaSegments(material, buffer);
}

export async function ingestMaterial(
  supabase: SupabaseClient<Database>,
  material: Material,
) {
  const { data: file, error: downloadError } = await supabase.storage
    .from("materials")
    .download(material.storage_path);

  if (downloadError || !file) {
    throw new Error(downloadError?.message || "Could not download the material.");
  }

  const segments = await extractSegments(
    material,
    Buffer.from(await file.arrayBuffer()),
  );
  const chunks = segments.flatMap((segment, index) =>
    chunkSourceText(segment, index),
  );

  if (chunks.length === 0) {
    throw new Error("No readable content was found in this material.");
  }

  const { error: deleteError } = await supabase
    .from("material_chunks")
    .delete()
    .eq("material_id", material.id)
    .eq("user_id", material.user_id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  for (let offset = 0; offset < chunks.length; offset += 32) {
    const batch = chunks.slice(offset, offset + 32);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text));

    if (embeddings.length !== batch.length) {
      throw new Error("Embedding provider returned an incomplete batch.");
    }

    const { error: insertError } = await supabase.from("material_chunks").insert(
      batch.map((chunk, index) => ({
        material_id: material.id,
        user_id: material.user_id,
        study_space_id: material.study_space_id,
        chunk_index: chunk.chunkIndex,
        content: chunk.text,
        page_number: chunk.pageNumber,
        start_seconds: chunk.startSeconds,
        end_seconds: chunk.endSeconds,
        embedding: embeddings[index],
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return { chunkCount: chunks.length };
}
