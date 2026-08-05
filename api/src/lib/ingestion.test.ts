import { describe, expect, it } from "vitest";
import { chunkSourceText } from "@/lib/ingestion";

describe("ingestion chunk indices", () => {
  it("uses cumulative chunk_index across multiple source segments", () => {
    const longText = "word ".repeat(400);
    const segments = [
      { text: longText, pageNumber: 1, startSeconds: null, endSeconds: null },
      { text: longText, pageNumber: 2, startSeconds: null, endSeconds: null },
    ];

    const chunks = [];
    let nextChunkIndex = 0;
    for (const segment of segments) {
      const segmentChunks = chunkSourceText(segment, nextChunkIndex);
      chunks.push(...segmentChunks);
      nextChunkIndex += segmentChunks.length;
    }

    const indices = chunks.map((chunk) => chunk.chunkIndex);
    expect(indices.length).toBeGreaterThan(2);
    expect(new Set(indices).size).toBe(indices.length);
    expect(indices).toEqual([...indices.keys()]);
  });
});
