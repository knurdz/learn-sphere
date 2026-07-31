import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { embedTexts } from "@/lib/providers/openai";

export type RetrievedChunk = {
  id: string;
  materialId: string;
  materialName: string;
  content: string;
  pageNumber: number | null;
  startSeconds: number | null;
  endSeconds: number | null;
  similarity: number;
};

export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    studySpaceId: string;
    question: string;
    limit?: number;
  },
) {
  const [queryEmbedding] = await embedTexts([input.question]);
  if (!queryEmbedding) {
    return [];
  }

  const { data, error } = await supabase.rpc("match_material_chunks", {
    query_embedding: queryEmbedding,
    match_user_id: input.userId,
    match_study_space_id: input.studySpaceId,
    match_count: input.limit || 8,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as Array<{
    id: string;
    material_id: string;
    material_name: string;
    content: string;
    page_number: number | null;
    start_seconds: number | null;
    end_seconds: number | null;
    similarity: number;
  }>)
    .filter((chunk) => chunk.similarity >= 0.18)
    .map((chunk) => ({
      id: chunk.id,
      materialId: chunk.material_id,
      materialName: chunk.material_name || "Study material",
      content: chunk.content,
      pageNumber: chunk.page_number,
      startSeconds: chunk.start_seconds,
      endSeconds: chunk.end_seconds,
      similarity: chunk.similarity,
    }));
}

export function formatCitationLabel(chunk: RetrievedChunk) {
  if (chunk.pageNumber) {
    return chunk.materialName + " · Page " + chunk.pageNumber;
  }

  if (chunk.startSeconds !== null) {
    const minutes = Math.floor(chunk.startSeconds / 60);
    const seconds = Math.floor(chunk.startSeconds % 60)
      .toString()
      .padStart(2, "0");
    return chunk.materialName + " · " + minutes + ":" + seconds;
  }

  return chunk.materialName;
}
