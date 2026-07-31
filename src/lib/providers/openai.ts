import { getOpenAIConfig } from "./config";

type EmbeddingResponse = {
  data?: Array<{ index: number; embedding: number[] }>;
  error?: { message?: string };
};

type TranscriptionResponse = {
  text?: string;
  segments?: Array<{
    text?: string;
    start?: number;
    end?: number;
  }>;
  error?: { message?: string };
};

async function readProviderError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return body?.error?.message || "The OpenAI request failed.";
}

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) {
    return [];
  }

  const config = getOpenAIConfig();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: config.embeddingModel,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    throw new Error(await readProviderError(response));
  }

  const body = (await response.json()) as EmbeddingResponse;
  if (!body.data) {
    throw new Error(body.error?.message || "OpenAI returned no embeddings.");
  }

  return [...body.data]
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function transcribeFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const config = getOpenAIConfig();
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.fileName,
  );
  formData.append("model", config.transcriptionModel);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readProviderError(response));
  }

  const body = (await response.json()) as TranscriptionResponse;
  if (!body.text) {
    throw new Error(body.error?.message || "OpenAI returned no transcript.");
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
