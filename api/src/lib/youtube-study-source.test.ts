import { describe, expect, it } from "vitest";

import { youtubeStoragePathMarker } from "./youtube-study-source";
import { youtubeMaterialFileName } from "./youtube";

describe("YouTube study source helpers", () => {
  it("uses a stable storage path marker per video id", () => {
    expect(youtubeMaterialFileName("abc123")).toBe("youtube-abc123.txt");
    expect(youtubeStoragePathMarker("abc123")).toBe("youtube-abc123.txt");
  });
});
