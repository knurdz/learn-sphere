import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  requiredServerEnv: vi.fn(() => "test-gemini-key"),
}));

import {
  EmbeddingRateLimitError,
  embedTexts,
  embedTextsInBatches,
  GEMINI_EMBED_BATCH_SIZE,
  parseRetryDelayMs,
} from "./gemini-embeddings";

describe("Gemini embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("parses retry delay from quota error messages", () => {
    expect(parseRetryDelayMs("Please retry in 48.482404216s.")).toBeGreaterThanOrEqual(48_000);
    expect(parseRetryDelayMs("Please retry in 48.482404216s.")).toBeLessThanOrEqual(49_500);
    expect(parseRetryDelayMs(undefined, [{ retryDelay: "12s" }])).toBeGreaterThanOrEqual(12_000);
  });

  it("retries once on a simulated 429 then succeeds", async () => {
    const embedding = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));
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
                  "You exceeded your current quota. Please retry in 1.5s.",
              },
            }),
            { status: 429 },
          );
        }
        return new Response(
          JSON.stringify({
            embeddings: [{ values: embedding }],
          }),
          { status: 200 },
        );
      }),
    );

    const promise = embedTexts(["hello"]);
    await vi.advanceTimersByTimeAsync(3_000);
    const result = await promise;

    expect(calls).toBe(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1536);
  });

  it("throws a friendly rate-limit error after retries are exhausted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: { message: "You exceeded your current quota. Please retry in 0.01s." },
          }),
          { status: 429 },
        ),
      ),
    );

    const promise = embedTexts(["hello"]).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(120_000);
    const error = await promise;

    expect(error).toBeInstanceOf(EmbeddingRateLimitError);
    expect((error as Error).message).toMatch(/rate-limited/i);
  });

  it("embeds in paced batches of GEMINI_EMBED_BATCH_SIZE", async () => {
    const embedding = Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0));
    const fetchMock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as {
        requests?: unknown[];
      };
      return new Response(
        JSON.stringify({
          embeddings: (body.requests || []).map(() => ({ values: embedding })),
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const texts = Array.from({ length: GEMINI_EMBED_BATCH_SIZE + 2 }, (_, i) => `t${i}`);
    const promise = embedTextsInBatches(texts);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;

    expect(result).toHaveLength(texts.length);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
