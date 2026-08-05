import { NextResponse } from "next/server";
import { resolveAndroidDownloadUrl } from "@/lib/github-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable download link for the landing page: resolves the newest release APK on
 * every click and redirects straight at the asset, so a new release is picked up
 * without redeploying the site.
 */
export async function GET() {
  const download = await resolveAndroidDownloadUrl();

  return NextResponse.redirect(download.url, {
    status: 302,
    headers: {
      // Let the browser follow a fresh lookup instead of caching an old asset URL.
      "Cache-Control": "no-store",
    },
  });
}
