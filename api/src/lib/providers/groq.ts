import { requiredServerEnv } from "./config";

export type GroqMessage = { role: "user" | "assistant"; content: string };

const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 4_000;

export class GroqRateLimitError extends Error {
  constructor(
    message = "The AI is briefly busy. Wait a few seconds and try again.",
  ) {
    super(message);
    this.name = "GroqRateLimitError";
  }
}

function getGroqConfig() {
  return {
    apiKey: requiredServerEnv("GROQ_API_KEY"),
    chatModel: process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
    transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function parseGroqRetryDelayMs(message: string | undefined): number {
  if (!message) return DEFAULT_RETRY_DELAY_MS;
  const match = message.match(/try again in\s+([\d.]+)\s*s/i);
  if (!match) return DEFAULT_RETRY_DELAY_MS;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_RETRY_DELAY_MS;
  return Math.min(Math.ceil(seconds * 1000) + 250, 30_000);
}

function isRateLimitMessage(status: number, message: string | undefined) {
  if (status === 429) return true;
  if (!message) return false;
  return /rate limit|tokens per minute|tpm|try again in/i.test(message);
}

async function generateGroqTextOnce(input: {
  system: string;
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  const config = getGroqConfig();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.apiKey,
      "Content-Type": "application/json",
    },
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
    const errorMessage = body?.error?.message || "Groq request failed.";
    if (isRateLimitMessage(response.status, errorMessage)) {
      const error = new GroqRateLimitError();
      (error as GroqRateLimitError & { retryAfterMs: number }).retryAfterMs =
        parseGroqRetryDelayMs(errorMessage);
      throw error;
    }
    throw new Error(errorMessage);
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}

export async function generateGroqText(input: {
  system: string;
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}) {
  let attempt = 0;
  while (true) {
    try {
      return await generateGroqTextOnce(input);
    } catch (error) {
      if (!(error instanceof GroqRateLimitError) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }
      const retryAfterMs =
        (error as GroqRateLimitError & { retryAfterMs?: number }).retryAfterMs ??
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
  const config = getGroqConfig();
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.fileName,
  );
  formData.append("model", config.transcriptionModel);
  formData.append("response_format", "verbose_json");
  if (input.language && input.language !== "multi") {
    formData.append("language", input.language);
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + config.apiKey },
      body: formData,
    },
  );
  const body = (await response.json().catch(() => null)) as {
    text?: string;
    segments?: Array<{ text?: string; start?: number; end?: number }>;
    error?: { message?: string };
  } | null;

  if (!response.ok || !body?.text) {
    throw new Error(body?.error?.message || "Groq transcription failed.");
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
