import { describe, expect, it } from "vitest";
import { isWhisperSilenceHallucination } from "./voice-transcription";

describe("isWhisperSilenceHallucination", () => {
  it("flags thank-you on tiny audio", () => {
    expect(isWhisperSilenceHallucination("Thank you thank you", 500)).toBe(true);
  });

  it("allows real questions on normal-sized audio", () => {
    expect(isWhisperSilenceHallucination("What is photosynthesis?", 12000)).toBe(false);
  });

  it("flags repeated thank-you on any clip size", () => {
    expect(isWhisperSilenceHallucination("Thank you thank you thank you", 20000)).toBe(true);
    expect(isWhisperSilenceHallucination("Thanks for watching. Subscribe.", 12000)).toBe(true);
  });

  it("allows a real question that starts with thanks", () => {
    expect(isWhisperSilenceHallucination("Thank you. What is photosynthesis?", 12000)).toBe(false);
  });
});
