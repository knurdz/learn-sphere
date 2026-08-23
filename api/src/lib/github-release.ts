export type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type GitHubRelease = {
  tag_name: string;
  draft: boolean;
  assets: GitHubReleaseAsset[];
  published_at?: string | null;
  created_at?: string | null;
};

export type AndroidDownloadInfo = {
  url: string;
  versionLabel: string | null;
  source: "override" | "github-apk" | "github-fallback";
};

const DEFAULT_GITHUB_REPO = "knurdz/learn-sphere";

/** Stable URL the landing page links to; it redirects to the newest APK asset. */
export const ANDROID_DOWNLOAD_PATH = "/api/download/android";

/** Tags pulled from the Atom feed that we are willing to look up individually. */
const MAX_TAG_LOOKUPS = 3;

const GITHUB_FETCH: RequestInit = { cache: "no-store" };

function releaseTime(release: GitHubRelease): number {
  const stamp = release.published_at ?? release.created_at;
  const parsed = stamp ? Date.parse(stamp) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Version string from a release tag (e.g. `v0.1.2` → `0.1.2`). */
export function versionLabelFromReleaseTag(tagName: string): string {
  return tagName.replace(/^v/i, "");
}

/**
 * Version shown on the download button when inferring from an asset name alone.
 */
export function deriveVersionLabel(assetName: string, tagName: string): string {
  const fromAsset = assetName.match(/\d+\.\d+(?:\.\d+)?/)?.[0];
  if (fromAsset) return fromAsset;
  return versionLabelFromReleaseTag(tagName);
}

/** Canonical GitHub release asset URL: `/releases/download/{tag}/{filename}`. */
export function githubReleaseAssetDownloadUrl(
  repo: string,
  tagName: string,
  assetName: string,
): string {
  const tag = encodeURIComponent(tagName);
  const file = encodeURIComponent(assetName);
  return `https://github.com/${repo}/releases/download/${tag}/${file}`;
}

export function pickLatestPublishedApkUrl(
  repo: string,
  releases: GitHubRelease[],
): { url: string; versionLabel: string } | null {
  // GitHub does not guarantee ordering, so sort newest-first before picking.
  const candidates = [...releases].sort((a, b) => releaseTime(b) - releaseTime(a));

  for (const release of candidates) {
    if (release.draft) continue;
    const apk = release.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
    if (apk) {
      return {
        url: githubReleaseAssetDownloadUrl(repo, release.tag_name, apk.name),
        versionLabel: versionLabelFromReleaseTag(release.tag_name),
      };
    }
  }
  return null;
}

/**
 * Release tags from the repo's Atom feed, newest first.
 *
 * The feed stays correct when `GET /releases` serves a stale or partial list,
 * which GitHub has been observed doing for freshly published releases.
 */
export function parseReleaseTagsFromAtom(xml: string): string[] {
  const tags: string[] = [];
  const pattern = /\/releases\/tag\/([^"'<\s]+)/g;

  for (const match of xml.matchAll(pattern)) {
    const tag = decodeURIComponent(match[1]);
    if (!tags.includes(tag)) tags.push(tag);
  }

  return tags;
}

/**
 * Releases page for the repo. Not `/releases/latest`, which 404s while every
 * release is still marked as a pre-release.
 */
export function githubReleasesLatestPage(repo: string): string {
  return `https://github.com/${repo}/releases`;
}

function apiHeaders(token: string | undefined): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "LearnSphere-Landing",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchReleaseList(repo: string, token?: string): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: apiHeaders(token),
      ...GITHUB_FETCH,
    });
    if (!response.ok) return [];
    const releases = (await response.json()) as GitHubRelease[];
    return Array.isArray(releases) ? releases : [];
  } catch {
    return [];
  }
}

async function fetchReleaseByTag(
  repo: string,
  tag: string,
  token?: string,
): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
      { headers: apiHeaders(token), ...GITHUB_FETCH },
    );
    if (!response.ok) return null;
    return (await response.json()) as GitHubRelease;
  } catch {
    return null;
  }
}

async function fetchAtomTags(repo: string): Promise<string[]> {
  try {
    const response = await fetch(`https://github.com/${repo}/releases.atom`, {
      headers: { Accept: "application/atom+xml", "User-Agent": "LearnSphere-Landing" },
      ...GITHUB_FETCH,
    });
    if (!response.ok) return [];
    return parseReleaseTagsFromAtom(await response.text());
  } catch {
    return [];
  }
}

export async function resolveAndroidDownloadUrl(): Promise<AndroidDownloadInfo> {
  const override =
    process.env.ANDROID_DOWNLOAD_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL?.trim();
  if (override) {
    const versionFromUrl = override.match(/learn-sphere-v?(\d+\.\d+\.\d+)/i)?.[1] ?? null;
    return { url: override, versionLabel: versionFromUrl, source: "override" };
  }

  const repo = process.env.ANDROID_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO;
  const fallback = githubReleasesLatestPage(repo);
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();

  const [listed, atomTags] = await Promise.all([
    fetchReleaseList(repo, token),
    fetchAtomTags(repo),
  ]);

  // Look up any release the Atom feed knows about but the list endpoint omitted.
  const listedTags = new Set(listed.map((release) => release.tag_name));
  const missingTags = atomTags
    .filter((tag) => !listedTags.has(tag))
    .slice(0, MAX_TAG_LOOKUPS);
  const recovered = await Promise.all(
    missingTags.map((tag) => fetchReleaseByTag(repo, tag, token)),
  );

  const releases = [...listed, ...recovered.filter((r): r is GitHubRelease => r !== null)];
  const picked = pickLatestPublishedApkUrl(repo, releases);
  if (picked) {
    return { url: picked.url, versionLabel: picked.versionLabel, source: "github-apk" };
  }

  // When the Releases API is rate-limited or strips assets, the Atom feed still
  // lists tags. Our CI always uploads `learn-sphere-<tag>.apk`.
  const atomTag = atomTags[0];
  if (atomTag) {
    return {
      url: githubReleaseAssetDownloadUrl(repo, atomTag, `learn-sphere-${atomTag}.apk`),
      versionLabel: versionLabelFromReleaseTag(atomTag),
      source: "github-apk",
    };
  }

  return { url: fallback, versionLabel: null, source: "github-fallback" };
}
