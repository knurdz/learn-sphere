import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { chunkSourceText, type SourceSegment } from "@/lib/ingestion";
import { buildMaterialStoragePath } from "@/lib/materials";
import { embedTexts } from "@/lib/providers/gemini-embeddings";
import {
  getYouTubeVideoId,
  getYouTubeVideoSource,
  youtubeMaterialFileName,
  type YouTubeVideoContext,
} from "@/lib/youtube";

export type YouTubeStudySource = {
  materialId: string;
  videoContext: YouTubeVideoContext;
};

export function youtubeStoragePathMarker(videoId: string) {
  return youtubeMaterialFileName(videoId);
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

async function syncTranscriptChunks(
  supabase: SupabaseClient<Database>,
  materialId: string,
  userId: string,
  studySpaceId: string,
  segments: SourceSegment[],
) {
  const ingestionChunks: ReturnType<typeof chunkSourceText> = [];
  let nextChunkIndex = 0;
  for (const segment of segments) {
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

  for (let offset = 0; offset < ingestionChunks.length; offset += 32) {
    const batch = ingestionChunks.slice(offset, offset + 32);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text));

    if (embeddings.length !== batch.length) {
      throw new Error("Embedding provider returned an incomplete batch.");
    }

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
        embedding: embeddings[index],
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
): Promise<YouTubeStudySource> {
  const videoId = getYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error("Enter a valid YouTube watch, Shorts, or youtu.be URL.");
  }

  const { segments: timedSegments, ...videoContext } = await getYouTubeVideoSource(youtubeUrl);
  if (timedSegments.length === 0) {
    throw new Error(
      "This YouTube video could not be read from captions or audio transcription. Try another video URL.",
    );
  }

  const sourceSegments: SourceSegment[] = timedSegments.map((segment) => ({
    text: segment.text,
    pageNumber: null,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
  }));

  let material = await findYouTubeMaterial(supabase, userId, studySpaceId, videoId);
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
