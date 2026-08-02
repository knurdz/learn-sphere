import { requiredServerEnv } from "./config";

export type GroqMessage = { role: "user" | "assistant"; content: string };

function getGroqConfig() {
  return {
    apiKey: requiredServerEnv("GROQ_API_KEY"),
    chatModel: process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
    transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
  };
}

export async function generateGroqText(input: {
  system: string;
  messages: GroqMessage[];
  maxTokens?: number;
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
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(body?.error?.message || "Groq request failed.");
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}

export async function transcribeFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
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
