import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EmbeddingRateLimitError,
  embedTexts,
  embedTextsInBatches,
  GEMINI_EMBED_BATCH_SIZE,
  parseRetryDelayMs,
} from "./gemini-embeddings";

describe("Foundry embeddings via gemini compatibility exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.FOUNDRY_API_KEY = "test-foundry-key";
    process.env.FOUNDRY_OPENAI_ENDPOINT = "https://example.openai.azure.com/openai/v1";
    process.env.FOUNDRY_EMBEDDING_DIMENSIONS = "1536";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.FOUNDRY_API_KEY;
    delete process.env.FOUNDRY_OPENAI_ENDPOINT;
    delete process.env.FOUNDRY_EMBEDDING_DIMENSIONS;
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
              error: { message: "You exceeded your current quota. Please retry in 1.5s." },
            }),
            { status: 429 },
          );
        }
        return new Response(
          JSON.stringify({
            data: [{ embedding, index: 0 }],
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
      vi.fn(
        async () =>
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
      const body = JSON.parse(String(init?.body || "{}")) as { input?: unknown[] };
      return new Response(
        JSON.stringify({
          data: (body.input || []).map((_, index) => ({ embedding, index })),
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
