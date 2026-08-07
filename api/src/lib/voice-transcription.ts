/** Whisper often emits these on near-silent clips when Groq has no VAD controls. */
const HALLUCINATION_PHRASES = [
  "thank you",
  "thank you thank you",
  "thanks for watching",
  "thank you for watching",
  "thanks for listening",
  "subscribe",
];

function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isWhisperSilenceHallucination(transcript: string, audioSizeBytes: number): boolean {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return false;

  const isKnownPhrase = HALLUCINATION_PHRASES.some(
    (phrase) => normalized === phrase || normalized.startsWith(`${phrase} `),
  );
  if (!isKnownPhrase) return false;

  if (audioSizeBytes < 4096) return true;

  return HALLUCINATION_PHRASES.includes(normalized);
}
