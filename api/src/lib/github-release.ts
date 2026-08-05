export type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

export type GitHubRelease = {
  tag_name: string;
  draft: boolean;
  assets: GitHubReleaseAsset[];
};

export type AndroidDownloadInfo = {
  url: string;
  versionLabel: string | null;
  source: "override" | "github-apk" | "github-fallback";
};

const DEFAULT_GITHUB_REPO = "knurdz/learn-sphere";

export function pickLatestPublishedApkUrl(
  releases: GitHubRelease[],
): { url: string; versionLabel: string } | null {
  for (const release of releases) {
    if (release.draft) continue;
    const apk = release.assets.find((asset) => asset.name.toLowerCase().endsWith(".apk"));
    if (apk) {
      return { url: apk.browser_download_url, versionLabel: release.tag_name };
    }
  }
  return null;
}

export function githubReleasesLatestPage(repo: string): string {
  return `https://github.com/${repo}/releases/latest`;
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

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "LearnSphere-Landing",
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
