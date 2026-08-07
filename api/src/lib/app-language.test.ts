import { describe, expect, it } from "vitest";
import {
  APP_LANGUAGE_HEADER,
  getAppLanguageDefinition,
  languageGenerationDirective,
  languageSpokenTutorDirective,
  liveVoiceErrorMessage,
  localizedGreeting,
  normalizeAppLanguageCode,
  resolveAppLanguage,
} from "./app-language";

describe("app language", () => {
  it("normalizes locale tags to supported codes", () => {
    expect(normalizeAppLanguageCode("ta-IN")).toBe("ta");
    expect(normalizeAppLanguageCode("xx")).toBe("en");
  });

  it("resolves from custom header then accept-language", () => {
    const fromHeader = new Request("http://localhost", {
      headers: { [APP_LANGUAGE_HEADER]: "si" },
    });
    expect(resolveAppLanguage(fromHeader)).toBe("si");

    const fromAccept = new Request("http://localhost", {
      headers: { "accept-language": "fr-FR,en;q=0.8" },
    });
    expect(resolveAppLanguage(fromAccept)).toBe("fr");
  });

  it("adds generation directives for non-english locales", () => {
    expect(languageGenerationDirective("ta")).toContain("Tamil");
    expect(languageGenerationDirective("en")).toContain("English");
  });

  it("avoids Speak-every phrasing in spoken tutor directives", () => {
    expect(languageSpokenTutorDirective("en")).not.toMatch(/^Speak every/i);
    expect(languageSpokenTutorDirective("en")).toContain("Reply in English");
  });

  it("flags sinhala live voice as unsupported", () => {
    expect(getAppLanguageDefinition("si").liveVoiceSupported).toBe(false);
    expect(liveVoiceErrorMessage("si")).toMatch(/Sinhala/);
    expect(liveVoiceErrorMessage("ta")).toBeNull();
  });

  it("returns localized live tutor greetings", () => {
    expect(localizedGreeting("tutor", "ta")).toMatch(/வணக்கம்/);
    expect(localizedGreeting("tutor", "en")).toMatch(/Hello/);
  });
});
