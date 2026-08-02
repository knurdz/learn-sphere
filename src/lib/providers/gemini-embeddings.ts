import { requiredServerEnv } from "./config";

type GeminiTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function getGeminiEmbeddingConfig() {
  return {
    apiKey: requiredServerEnv("GEMINI_API_KEY"),
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    dimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || "1536"),
  };
}

export async function embedTexts(
  texts: string[],
  task: GeminiTask = "RETRIEVAL_DOCUMENT",
) {
  if (texts.length === 0) return [];

  const config = getGeminiEmbeddingConfig();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:batchEmbedContents`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${config.model}`,
          content: { parts: [{ text }] },
          embedContentConfig: {
            taskType: task,
            outputDimensionality: config.dimensions,
            autoTruncate: true,
          },
        })),
      }),
    },
  );

  const body = (await response.json().catch(() => null)) as {
    embeddings?: Array<{ values?: number[] }>;
    error?: { message?: string };
  } | null;

  if (!response.ok || !body?.embeddings) {
    throw new Error(
      body?.error?.message || "Gemini embedding request failed.",
    );
  }

  const rawEmbeddings = body.embeddings.map(
    (embedding) => embedding.values || [],
  );
  const embeddings = rawEmbeddings.map((embedding) =>
    embedding.length > config.dimensions
      ? embedding.slice(0, config.dimensions)
      : embedding,
  );
  if (
    embeddings.length !== texts.length ||
    embeddings.some((embedding) => embedding.length !== config.dimensions)
  ) {
    throw new Error(
      `Gemini returned embeddings with an unexpected dimension. Expected ${config.dimensions}; received ${rawEmbeddings[0]?.length || 0}.`,
    );
  }

  return embeddings.map((embedding) => {
    const norm = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );
    return norm > 0 ? embedding.map((value) => value / norm) : embedding;
  });
}
