import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { chunkSourceText, type SourceSegment } from "@/lib/ingestion";
import { buildMaterialStoragePath } from "@/lib/materials";
import { embedTextsInBatches } from "@/lib/providers/gemini-embeddings";
import {
  getYouTubeVideoId,
  getYouTubeVideoSource,
  youtubeMaterialFileName,
  type YouTubeVideoContext,
} from "@/lib/youtube";

export type EnsureYouTubeStudySourceOptions = {
  preferredLanguage?: string;
  allowAudioTranscription?: boolean;
};

export type YouTubeStudySource = {
  materialId: string;
  videoContext: YouTubeVideoContext;
};

const MERGED_CAPTION_MAX_CHARS = 1400;

export function youtubeStoragePathMarker(videoId: string) {
  return youtubeMaterialFileName(videoId);
}

/**
 * Pack short timed caption lines into fewer ~1400-char segments so embedding
 * stays within Gemini free-tier RPM (each text counts as one request).
 */
export function mergeTimedCaptionSegments(
  segments: SourceSegment[],
  maxCharacters = MERGED_CAPTION_MAX_CHARS,
): SourceSegment[] {
  const merged: SourceSegment[] = [];
  let buffer = "";
  let startSeconds: number | null = null;
  let endSeconds: number | null = null;

  const flush = () => {
    const text = buffer.replace(/\s+/g, " ").trim();
    if (!text) {
      buffer = "";
      startSeconds = null;
      endSeconds = null;
      return;
    }
    merged.push({
      text,
      pageNumber: null,
      startSeconds,
      endSeconds,
    });
    buffer = "";
    startSeconds = null;
    endSeconds = null;
  };

  for (const segment of segments) {
    const piece = segment.text.replace(/\s+/g, " ").trim();
    if (!piece) continue;

    const next = buffer ? `${buffer} ${piece}` : piece;
    if (buffer && next.length > maxCharacters) {
      flush();
      buffer = piece;
      startSeconds = segment.startSeconds;
      endSeconds = segment.endSeconds;
      continue;
    }

    buffer = next;
    if (startSeconds === null) {
      startSeconds = segment.startSeconds;
    }
    endSeconds = segment.endSeconds ?? endSeconds;
  }

  flush();
  return merged;
}

async function findYouTubeMaterial(
  supabase: SupabaseClient<Database>,
  userId: string,
  studySpaceId: string,
  videoId: string,
) {
  const marker = youtubeStoragePathMarker(videoId);
  const { data, error } = await supabase
    .from("materials")
    .select("id,name,storage_path,status")
    .eq("user_id", userId)
    .eq("study_space_id", studySpaceId)
    .ilike("storage_path", `%${marker}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function materialHasChunks(
  supabase: SupabaseClient<Database>,
  materialId: string,
  userId: string,
) {
  const { count, error } = await supabase
    .from("material_chunks")
    .select("id", { count: "exact", head: true })
    .eq("material_id", materialId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

async function syncTranscriptChunks(
  supabase: SupabaseClient<Database>,
  materialId: string,
  userId: string,
  studySpaceId: string,
  segments: SourceSegment[],
) {
  const packedSegments = mergeTimedCaptionSegments(segments);
  const ingestionChunks: ReturnType<typeof chunkSourceText> = [];
  let nextChunkIndex = 0;
  for (const segment of packedSegments) {
    const segmentChunks = chunkSourceText(segment, nextChunkIndex);
    ingestionChunks.push(...segmentChunks);
    nextChunkIndex += segmentChunks.length;
  }

  if (ingestionChunks.length === 0) {
    throw new Error("No readable content was found in this YouTube transcript.");
  }

  const { error: deleteError } = await supabase
    .from("material_chunks")
    .delete()
    .eq("material_id", materialId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const embeddings = await embedTextsInBatches(
    ingestionChunks.map((chunk) => chunk.text),
  );

  if (embeddings.length !== ingestionChunks.length) {
    throw new Error("Embedding provider returned an incomplete batch.");
  }

  for (let offset = 0; offset < ingestionChunks.length; offset += 32) {
    const batch = ingestionChunks.slice(offset, offset + 32);
    const embeddingBatch = embeddings.slice(offset, offset + 32);
    const { error: insertError } = await supabase.from("material_chunks").insert(
      batch.map((chunk, index) => ({
        material_id: materialId,
        user_id: userId,
        study_space_id: studySpaceId,
        chunk_index: chunk.chunkIndex,
        content: chunk.text,
        page_number: chunk.pageNumber,
        start_seconds: chunk.startSeconds,
        end_seconds: chunk.endSeconds,
        embedding: embeddingBatch[index],
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return ingestionChunks.length;
}

export async function ensureYouTubeStudySource(
  supabase: SupabaseClient<Database>,
  userId: string,
  studySpaceId: string,
  youtubeUrl: string,
  options: EnsureYouTubeStudySourceOptions = {},
): Promise<YouTubeStudySource> {
  const videoId = getYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error("Enter a valid YouTube watch, Shorts, or youtu.be URL.");
  }

  const existing = await findYouTubeMaterial(supabase, userId, studySpaceId, videoId);
  if (existing?.status === "ready" && (await materialHasChunks(supabase, existing.id, userId))) {
    // Skip caption re-fetch and re-embedding when this video is already indexed.
    return {
      materialId: existing.id,
      videoContext: {
        id: videoId,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
        title: existing.name || "YouTube lesson",
        author: "YouTube creator",
        transcript: "",
      },
    };
  }

  const { segments: timedSegments, ...videoContext } = await getYouTubeVideoSource(
    youtubeUrl,
    options,
  );
  if (timedSegments.length === 0) {
    throw new Error(
      "This YouTube URL could not be read from captions or audio transcription. Try another public video.",
    );
  }

  const sourceSegments: SourceSegment[] = timedSegments.map((segment) => ({
    text: segment.text,
    pageNumber: null,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
  }));

  let material = existing;
  const transcriptBytes = Math.max(1, videoContext.transcript.length);

  if (!material) {
    const materialId = crypto.randomUUID();
    const storagePath = buildMaterialStoragePath(
      userId,
      materialId,
      youtubeMaterialFileName(videoId),
    );
    const title = videoContext.title.slice(0, 120);

    const { data, error } = await supabase
      .from("materials")
      .insert({
        id: materialId,
        user_id: userId,
        study_space_id: studySpaceId,
        name: title,
        mime_type: "video/mp4",
        size_bytes: transcriptBytes,
        storage_path: storagePath,
        status: "ready",
        ingested_at: new Date().toISOString(),
      })
      .select("id,name,storage_path,status")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not save the YouTube source.");
    }
    material = data;
  }

  await syncTranscriptChunks(
    supabase,
    material.id,
    userId,
    studySpaceId,
    sourceSegments,
  );

  return { materialId: material.id, videoContext };
}
