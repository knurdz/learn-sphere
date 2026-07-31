import { getAnthropicConfig } from "./config";

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

export async function generateClaudeText(input: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}) {
  const config = getAnthropicConfig();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: input.maxTokens || 1200,
      system: input.system,
      messages: input.messages,
    }),
  });

  const body = (await response.json().catch(() => null)) as ClaudeResponse | null;
  if (!response.ok) {
    throw new Error(body?.error?.message || "The Claude request failed.");
  }

  const text = (body?.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }

  return text;
}
