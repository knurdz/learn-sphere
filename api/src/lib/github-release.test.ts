import { describe, expect, it } from "vitest";
import { parseReleaseTagsFromAtom, pickLatestPublishedApkUrl } from "./github-release";

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

  it("picks the newest release even when the API returns them out of order", () => {
    const url = pickLatestPublishedApkUrl([
      {
        tag_name: "v0.1.0",
        draft: false,
        published_at: "2026-08-05T15:23:28Z",
        assets: [{ name: "app-release.apk", browser_download_url: "https://old.apk" }],
      },
      {
        tag_name: "v0.1.1",
        draft: false,
        published_at: "2026-08-05T15:53:18Z",
        assets: [{ name: "learn-sphere-v0.1.1.apk", browser_download_url: "https://new.apk" }],
      },
    ]);
    expect(url).toEqual({ url: "https://new.apk", versionLabel: "v0.1.1" });
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

describe("parseReleaseTagsFromAtom", () => {
  it("returns tags newest-first without duplicates", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>tag:github.com,2008:Repository/1324098545/v0.1.1</id>
          <link rel="alternate" type="text/html" href="https://github.com/knurdz/learn-sphere/releases/tag/v0.1.1"/>
        </entry>
        <entry>
          <id>tag:github.com,2008:Repository/1324098545/v0.1.0</id>
          <link rel="alternate" type="text/html" href="https://github.com/knurdz/learn-sphere/releases/tag/v0.1.0"/>
        </entry>
      </feed>`;

    expect(parseReleaseTagsFromAtom(xml)).toEqual(["v0.1.1", "v0.1.0"]);
  });

  it("decodes escaped tag names and tolerates junk", () => {
    const xml = `<link href="https://github.com/o/r/releases/tag/release%2F2026-08-05"/>`;
    expect(parseReleaseTagsFromAtom(xml)).toEqual(["release/2026-08-05"]);
    expect(parseReleaseTagsFromAtom("not xml at all")).toEqual([]);
  });
});
