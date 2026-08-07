import { describe, expect, it } from "vitest";
import { isWhisperSilenceHallucination } from "./voice-transcription";

describe("isWhisperSilenceHallucination", () => {
  it("flags thank-you on tiny audio", () => {
    expect(isWhisperSilenceHallucination("Thank you thank you", 500)).toBe(true);
  });

  it("allows real questions on normal-sized audio", () => {
    expect(isWhisperSilenceHallucination("What is photosynthesis?", 12000)).toBe(false);
  });

  it("flags pure thank-you even on larger clips when nothing else was said", () => {
    expect(isWhisperSilenceHallucination("Thank you.", 8000)).toBe(true);
  });
});
