import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  requiredServerEnv: vi.fn(() => "test-groq-key"),
}));

import {
  generateGroqText,
  GroqRateLimitError,
  parseGroqRetryDelayMs,
} from "./groq";

describe("Groq text generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.GROQ_CHAT_MODEL = "openai/gpt-oss-120b";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("parses retry delay from rate-limit messages", () => {
    expect(parseGroqRetryDelayMs("Please try again in 3.637499999s.")).toBeGreaterThanOrEqual(
      3_000,
    );
    expect(parseGroqRetryDelayMs("Please try again in 3.637499999s.")).toBeLessThanOrEqual(4_500);
  });

  it("retries once on a simulated rate limit then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  "Rate limit reached for model openai/gpt-oss-120b. Please try again in 1.5s.",
              },
            }),
            { status: 429 },
          );
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200 },
        );
      }),
    );

    const promise = generateGroqText({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 2500,
    });
    await vi.advanceTimersByTimeAsync(3_000);
    const text = await promise;

    expect(calls).toBe(2);
    expect(text).toBe('{"ok":true}');
  });

  it("throws a friendly rate-limit error after retries are exhausted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message:
                "Rate limit reached for model openai/gpt-oss-120b. Please try again in 0.01s.",
            },
          }),
          { status: 429 },
        ),
      ),
    );

    const promise = generateGroqText({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(60_000);
    const error = await promise;

    expect(error).toBeInstanceOf(GroqRateLimitError);
    expect((error as Error).message).toMatch(/briefly busy/i);
  });
});
