import { firstDefinedServerEnv } from "./config";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 4_000;
const DEFAULT_EMBED_RETRY_DELAY_MS = 8_000;
const EMBED_BATCH_PAUSE_MS = 200;

/** Azure OpenAI embeddings allow large batches; keep requests modest. */
export const FOUNDRY_EMBED_BATCH_SIZE = 64;

export class FoundryRateLimitError extends Error {
  constructor(
    message = "The AI is briefly busy. Wait a few seconds and try again.",
  ) {
    super(message);
    this.name = "FoundryRateLimitError";
  }
}

export class EmbeddingRateLimitError extends Error {
  constructor(
    message = "AI indexing is briefly rate-limited. Wait a few seconds and try again.",
  ) {
    super(message);
    this.name = "EmbeddingRateLimitError";
  }
}

export function normalizeFoundryOpenAIBase(endpoint: string) {
  let base = endpoint.trim().replace(/\/+$/, "");
  base = base.replace(/\/(chat\/completions|embeddings|audio\/transcriptions)$/i, "");
  if (/\/openai\/v1$/i.test(base) || /\/v1$/i.test(base)) return base;
  if (
    /openai\.azure\.com$/i.test(base) ||
    /cognitiveservices\.azure\.com$/i.test(base) ||
    /services\.ai\.azure\.com$/i.test(base)
  ) {
    return `${base}/openai/v1`;
  }
  return `${base}/v1`;
}

function getFoundryConfig() {
  const endpoint = firstDefinedServerEnv("FOUNDRY_OPENAI_ENDPOINT", "AZURE_OPENAI_ENDPOINT");
  return {
    apiKey: firstDefinedServerEnv("FOUNDRY_API_KEY", "AZURE_OPENAI_API_KEY"),
    baseUrl: normalizeFoundryOpenAIBase(endpoint),
    chatModel: process.env.FOUNDRY_CHAT_MODEL?.trim() || "gpt-4.1-mini",
    transcriptionModel:
      process.env.FOUNDRY_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-mini-transcribe",
    embeddingModel: process.env.FOUNDRY_EMBEDDING_MODEL?.trim() || "text-embedding-3-large",
    // Native 3-large size is 3072; pgvector IVFFlat maxes at 2000, so request 1536.
    embeddingDimensions: Number(process.env.FOUNDRY_EMBEDDING_DIMENSIONS || "1536"),
  };
}

function foundryHeaders(apiKey: string, json = false) {
  return {
    Authorization: "Bearer " + apiKey,
    "api-key": apiKey,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function parseRetryDelayMs(message: string | undefined, details?: unknown): number {
  if (typeof message === "string") {
    const secondsMatch = message.match(/(?:try again|retry)\s+in\s+([\d.]+)\s*s/i);
    if (secondsMatch) {
      const seconds = Number(secondsMatch[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(Math.ceil(seconds * 1000) + 250, 90_000);
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
          return Math.min(Math.ceil(seconds * 1000) + 250, 90_000);
        }
      }
    }
  }

  return DEFAULT_RETRY_DELAY_MS;
}

function headerRetryDelayMs(response: Response) {
  const retryAfterMs = response.headers.get("retry-after-ms");
  if (retryAfterMs) {
    const ms = Number(retryAfterMs);
    if (Number.isFinite(ms) && ms > 0) return Math.min(ms + 250, 90_000);
  }
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(Math.ceil(seconds * 1000) + 250, 90_000);
    }
  }
  return null;
}

function isRateLimitMessage(status: number, message: string | undefined) {
  if (status === 429) return true;
  if (!message) return false;
  return /rate limit|tokens per minute|tpm|try again in|too many requests|quota/i.test(message);
}

async function generateChatTextOnce(input: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  const config = getFoundryConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: foundryHeaders(config.apiKey, true),
    body: JSON.stringify({
      model: config.chatModel,
      messages: [{ role: "system", content: input.system }, ...input.messages],
      max_tokens: input.maxTokens || 1200,
      temperature: input.temperature ?? 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    const errorMessage = body?.error?.message || "Foundry chat request failed.";
    if (isRateLimitMessage(response.status, errorMessage)) {
      const error = new FoundryRateLimitError();
      (error as FoundryRateLimitError & { retryAfterMs: number }).retryAfterMs =
        headerRetryDelayMs(response) ?? parseRetryDelayMs(errorMessage);
      throw error;
    }
    throw new Error(errorMessage);
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Foundry returned an empty chat response.");
  return text;
}

export async function generateChatText(input: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  let attempt = 0;
  while (true) {
    try {
      return await generateChatTextOnce(input);
    } catch (error) {
      if (!(error instanceof FoundryRateLimitError) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }
      const retryAfterMs =
        (error as FoundryRateLimitError & { retryAfterMs?: number }).retryAfterMs ??
        DEFAULT_RETRY_DELAY_MS;
      attempt += 1;
      await sleep(retryAfterMs);
    }
  }
}

export async function transcribeFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  language?: string;
}) {
  const config = getFoundryConfig();
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.fileName,
  );
  formData.append("model", config.transcriptionModel);
  formData.append("response_format", "json");
  if (input.language && input.language !== "multi") {
    formData.append("language", input.language);
  }

  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: foundryHeaders(config.apiKey),
    body: formData,
  });
  const body = (await response.json().catch(() => null)) as {
    text?: string;
    segments?: Array<{ text?: string; start?: number; end?: number }>;
    error?: { message?: string };
  } | null;

  if (!response.ok || !body?.text) {
    throw new Error(body?.error?.message || "Foundry transcription failed.");
  }

  const segments = (body.segments || [])
    .map((segment) => ({
      text: segment.text?.trim() || "",
      startSeconds: typeof segment.start === "number" ? segment.start : null,
      endSeconds: typeof segment.end === "number" ? segment.end : null,
    }))
    .filter((segment) => segment.text.length > 0);

  return segments.length > 0
    ? segments
    : [{ text: body.text.trim(), startSeconds: null, endSeconds: null }];
}

async function embedTextsOnce(texts: string[]): Promise<number[][]> {
  const config = getFoundryConfig();
  const response = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: foundryHeaders(config.apiKey, true),
    body: JSON.stringify({
      model: config.embeddingModel,
      input: texts,
      dimensions: config.embeddingDimensions,
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
    error?: { message?: string; details?: unknown };
  } | null;

  const errorMessage = body?.error?.message;
  if (!response.ok || !body?.data) {
    if (isRateLimitMessage(response.status, errorMessage)) {
      const error = new EmbeddingRateLimitError();
      (error as EmbeddingRateLimitError & { retryAfterMs: number }).retryAfterMs =
        headerRetryDelayMs(response) ??
        parseRetryDelayMs(errorMessage, body?.error?.details);
      throw error;
    }
    throw new Error(errorMessage || "Foundry embedding request failed.");
  }

  const ordered = [...body.data].sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0),
  );
  const rawEmbeddings = ordered.map((item) => item.embedding || []);
  const embeddings = rawEmbeddings.map((embedding) =>
    embedding.length > config.embeddingDimensions
      ? embedding.slice(0, config.embeddingDimensions)
      : embedding,
  );
  if (
    embeddings.length !== texts.length ||
    embeddings.some((embedding) => embedding.length !== config.embeddingDimensions)
  ) {
    throw new Error(
      `Foundry returned embeddings with an unexpected dimension. Expected ${config.embeddingDimensions}; received ${rawEmbeddings[0]?.length || 0}.`,
    );
  }

  return embeddings.map((embedding) => {
    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
    return norm > 0 ? embedding.map((value) => value / norm) : embedding;
  });
}

export async function embedTexts(
  texts: string[],
  _task: EmbeddingTask = "RETRIEVAL_DOCUMENT",
) {
  if (texts.length === 0) return [];

  let attempt = 0;
  while (true) {
    try {
      return await embedTextsOnce(texts);
    } catch (error) {
      if (!(error instanceof EmbeddingRateLimitError) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }
      const retryAfterMs =
        (error as EmbeddingRateLimitError & { retryAfterMs?: number }).retryAfterMs ??
        DEFAULT_EMBED_RETRY_DELAY_MS;
      attempt += 1;
      await sleep(retryAfterMs);
    }
  }
}

export async function embedTextsInBatches(
  texts: string[],
  task: EmbeddingTask = "RETRIEVAL_DOCUMENT",
  batchSize = FOUNDRY_EMBED_BATCH_SIZE,
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
