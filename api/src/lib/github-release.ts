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

function releaseTime(release: GitHubRelease): number {
  const stamp = release.published_at ?? release.created_at;
  const parsed = stamp ? Date.parse(stamp) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function pickLatestPublishedApkUrl(
  releases: GitHubRelease[],
): { url: string; versionLabel: string } | null {
  // GitHub does not guarantee ordering, so sort newest-first before picking.
  const candidates = [...releases].sort((a, b) => releaseTime(b) - releaseTime(a));

  for (const release of candidates) {
    if (release.draft) continue;
    const apk = release.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
    if (apk) {
      return { url: apk.browser_download_url, versionLabel: release.tag_name };
    }
  }
  return null;
}

/**
 * Releases page for the repo. Not `/releases/latest`, which 404s while every
 * release is still marked as a pre-release.
 */
export function githubReleasesLatestPage(repo: string): string {
  return `https://github.com/${repo}/releases`;
}

export async function resolveAndroidDownloadUrl(): Promise<AndroidDownloadInfo> {
  const override =
    process.env.ANDROID_DOWNLOAD_URL?.trim() ||
    process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL?.trim();
  if (override) {
    return { url: override, versionLabel: null, source: "override" };
  }

  const repo = process.env.ANDROID_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO;
  const fallback = githubReleasesLatestPage(repo);
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LearnSphere-Landing",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return { url: fallback, versionLabel: null, source: "github-fallback" };
    }

    const releases = (await response.json()) as GitHubRelease[];
    const picked = pickLatestPublishedApkUrl(releases);
    if (picked) {
      return { url: picked.url, versionLabel: picked.versionLabel, source: "github-apk" };
    }
  } catch {
    /* use fallback */
  }

  return { url: fallback, versionLabel: null, source: "github-fallback" };
}
