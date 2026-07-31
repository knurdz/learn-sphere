function requiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing server environment variable: " + name);
  }
  return value;
}

export function getOpenAIConfig() {
  return {
    apiKey: requiredServerEnv("OPENAI_API_KEY"),
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
  };
}

export function getAnthropicConfig() {
  return {
    apiKey: requiredServerEnv("ANTHROPIC_API_KEY"),
    model: requiredServerEnv("ANTHROPIC_MODEL"),
  };
}
