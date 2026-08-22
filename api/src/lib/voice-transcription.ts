/** Whisper often emits these on near-silent clips when Groq has no VAD controls. */
const HALLUCINATION_PHRASES = [
  "thank you",
  "thank you thank you",
  "thanks for watching",
  "thank you for watching",
  "thanks for listening",
  "subscribe",
];

const HALLUCINATION_TOKEN =
  /\b(thank you for watching|thanks for watching|thanks for listening|thank you|thanks|subscribe)\b/g;

function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isThankYouOnly(normalized: string): boolean {
  const leftover = normalized.replace(HALLUCINATION_TOKEN, " ").replace(/\s+/g, " ").trim();
  return leftover.length === 0;
}

export function isWhisperSilenceHallucination(transcript: string, audioSizeBytes: number): boolean {
  const normalized = normalizeTranscript(transcript);
  if (!normalized) return false;

  if (isThankYouOnly(normalized)) return true;

  const isKnownPhrase = HALLUCINATION_PHRASES.some(
    (phrase) => normalized === phrase || normalized.startsWith(`${phrase} `),
  );
  if (!isKnownPhrase) return false;

  if (audioSizeBytes < 4096) return true;

  return HALLUCINATION_PHRASES.includes(normalized);
}
