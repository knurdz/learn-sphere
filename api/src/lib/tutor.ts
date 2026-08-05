import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLanguageCode } from "@/lib/app-language";
import {
  languageGenerationDirective,
  languageTutorDirective,
  tutorNoEvidenceMessage,
} from "@/lib/app-language";
import type { Citation, Database } from "@/lib/supabase/database";
import { generateGroqText, type GroqMessage } from "@/lib/providers/groq";
import {
  formatCitationLabel,
  retrieveRelevantChunks,
  type RetrievedChunk,
} from "@/lib/retrieval";

export type TutorAnswer = {
  answer: string;
  citations: Citation[];
};

function makeCitation(chunk: RetrievedChunk): Citation {
  return {
    chunkId: chunk.id,
    materialId: chunk.materialId,
    materialName: chunk.materialName,
    label: formatCitationLabel(chunk),
    quote: chunk.content.slice(0, 280),
    pageNumber: chunk.pageNumber,
    startSeconds: chunk.startSeconds,
    endSeconds: chunk.endSeconds,
  };
}

function parseClaudeTutorResponse(
  raw: string,
  chunks: RetrievedChunk[],
): TutorAnswer {
  const allowed = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const jsonCandidate = raw
    .replace(/^\x60\x60\x60(?:json)?/i, "")
    .replace(/\x60\x60\x60$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonCandidate) as {
      answer?: unknown;
      citation_ids?: unknown;
    };
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    const citationIds = Array.isArray(parsed.citation_ids)
      ? parsed.citation_ids.filter(
          (id): id is string => typeof id === "string" && allowed.has(id),
        )
      : [];

    if (answer) {
      const selected = citationIds
        .map((id) => allowed.get(id))
        .filter((chunk): chunk is RetrievedChunk => Boolean(chunk));
      return {
        answer,
        citations: (selected.length > 0 ? selected : chunks.slice(0, 1)).map(
          makeCitation,
        ),
      };
    }
  } catch {
    // Fall back to plain text if the provider does not return JSON.
  }

  return {
    answer: raw.trim(),
    citations: chunks.slice(0, 2).map(makeCitation),
  };
}

export async function answerTutorQuestion(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    studySpaceId: string;
    question: string;
    history?: GroqMessage[];
    languageCode?: AppLanguageCode;
  },
): Promise<TutorAnswer> {
  const languageCode = input.languageCode ?? "en";
  const chunks = await retrieveRelevantChunks(supabase, {
    userId: input.userId,
    studySpaceId: input.studySpaceId,
    question: input.question,
    limit: 8,
  });

  if (chunks.length === 0) {
    return {
      answer: tutorNoEvidenceMessage(languageCode),
      citations: [],
    };
  }

  const context = chunks
    .map(
      (chunk) =>
        "[SOURCE " +
        chunk.id +
        "] " +
        formatCitationLabel(chunk) +
        "\n" +
        chunk.content,
    )
    .join("\n\n");

  const raw = await generateGroqText({
    system:
      "You are LearnSphere's grounded tutor. Answer only from the supplied source excerpts. " +
      "If the sources do not support an answer, say so clearly. Return JSON only with this shape: " +
      '{"answer":"your concise explanation","citation_ids":["source-id"]}. ' +
      "Use only source IDs present in the context. Do not invent citations. " +
      languageTutorDirective(languageCode) +
      " " +
      languageGenerationDirective(languageCode),
    messages: [
      ...(input.history || []),
      {
        role: "user",
        content:
          "SOURCE EXCERPTS:\n" +
          context +
          "\n\nQUESTION:\n" +
          input.question,
      },
    ],
    maxTokens: 1200,
  });

  return parseClaudeTutorResponse(raw, chunks);
}
