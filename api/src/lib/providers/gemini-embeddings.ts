import { requiredServerEnv } from "./config";

type GeminiTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Free-tier embed RPM counts each text in a batch, so keep batches small. */
export const GEMINI_EMBED_BATCH_SIZE = 16;
const EMBED_BATCH_PAUSE_MS = 1200;
const MAX_EMBED_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 50_000;

export class EmbeddingRateLimitError extends Error {
  constructor(
    message = "AI indexing is briefly rate-limited. Wait about a minute and try again.",
  ) {
    super(message);
    this.name = "EmbeddingRateLimitError";
  }
}

function getGeminiEmbeddingConfig() {
  return {
    apiKey: requiredServerEnv("GEMINI_API_KEY"),
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    dimensions: Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || "1536"),
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function parseRetryDelayMs(message: string | undefined, details?: unknown): number {
  if (typeof message === "string") {
    const secondsMatch = message.match(/retry in\s+([\d.]+)\s*s/i);
    if (secondsMatch) {
      const seconds = Number(secondsMatch[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(Math.ceil(seconds * 1000) + 500, 90_000);
      }
    }
  }

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (
        detail &&
        typeof detail === "object" &&
        "retryDelay" in detail &&
        typeof (detail as { retryDelay?: unknown }).retryDelay === "string"
      ) {
        const raw = (detail as { retryDelay: string }).retryDelay;
        const seconds = Number(raw.replace(/s$/i, ""));
        if (Number.isFinite(seconds) && seconds > 0) {
          return Math.min(Math.ceil(seconds * 1000) + 500, 90_000);
        }
      }
    }
  }

  return DEFAULT_RETRY_DELAY_MS;
}

function isRateLimitError(status: number, message: string | undefined) {
  if (status === 429) return true;
  if (!message) return false;
  return /quota|rate.?limit|resource.?exhausted|exceeded your current quota/i.test(message);
}

async function embedTextsOnce(
  texts: string[],
  task: GeminiTask,
): Promise<number[][]> {
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
    error?: {
      message?: string;
      details?: unknown;
    };
  } | null;

  const errorMessage = body?.error?.message;
  if (!response.ok || !body?.embeddings) {
    if (isRateLimitError(response.status, errorMessage)) {
      const retryAfterMs = parseRetryDelayMs(errorMessage, body?.error?.details);
      const error = new EmbeddingRateLimitError();
      (error as EmbeddingRateLimitError & { retryAfterMs: number }).retryAfterMs =
        retryAfterMs;
      throw error;
    }
    throw new Error(errorMessage || "Gemini embedding request failed.");
  }

  const rawEmbeddings = body.embeddings.map((embedding) => embedding.values || []);
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

export async function embedTexts(
  texts: string[],
  task: GeminiTask = "RETRIEVAL_DOCUMENT",
) {
  if (texts.length === 0) return [];

  let attempt = 0;
  while (true) {
    try {
      return await embedTextsOnce(texts, task);
    } catch (error) {
      if (!(error instanceof EmbeddingRateLimitError) || attempt >= MAX_EMBED_RETRIES) {
        throw error;
      }
      const retryAfterMs =
        (error as EmbeddingRateLimitError & { retryAfterMs?: number }).retryAfterMs ??
        DEFAULT_RETRY_DELAY_MS;
      attempt += 1;
      await sleep(retryAfterMs);
    }
  }
}

/**
 * Embed many texts in small paced batches so free-tier RPM (per text) is not blown.
 */
export async function embedTextsInBatches(
  texts: string[],
  task: GeminiTask = "RETRIEVAL_DOCUMENT",
  batchSize = GEMINI_EMBED_BATCH_SIZE,
) {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];
  for (let offset = 0; offset < texts.length; offset += batchSize) {
    if (offset > 0) {
      await sleep(EMBED_BATCH_PAUSE_MS);
    }
    const batch = texts.slice(offset, offset + batchSize);
    const batchEmbeddings = await embedTexts(batch, task);
    if (batchEmbeddings.length !== batch.length) {
      throw new Error("Embedding provider returned an incomplete batch.");
    }
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}
