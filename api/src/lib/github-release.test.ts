import { describe, expect, it } from "vitest";
import { pickLatestPublishedApkUrl } from "./github-release";

describe("pickLatestPublishedApkUrl", () => {
  it("skips drafts and picks the first published release with an apk", () => {
    const url = pickLatestPublishedApkUrl([
      {
        tag_name: "v0.2.0",
        draft: true,
        assets: [{ name: "app-release.apk", browser_download_url: "https://draft.apk" }],
      },
      {
        tag_name: "v0.1.0",
        draft: false,
        assets: [{ name: "app-release.apk", browser_download_url: "https://published.apk" }],
      },
    ]);
    expect(url).toEqual({ url: "https://published.apk", versionLabel: "v0.1.0" });
  });

  it("returns null when no published apk exists", () => {
    expect(
      pickLatestPublishedApkUrl([
        { tag_name: "v0.1.0", draft: true, assets: [] },
        { tag_name: "v0.0.1", draft: false, assets: [{ name: "notes.txt", browser_download_url: "x" }] },
      ]),
    ).toBeNull();
  });
});
