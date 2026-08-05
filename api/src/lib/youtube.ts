import { fetchTranscript as fetchYouTubeTranscript } from "youtube-transcript";

export type YouTubeVideoContext = {
  id: string;
  url: string;
  embedUrl: string;
  title: string;
  author: string;
  transcript: string;
};

export type YouTubeTranscriptSegment = {
  text: string;
  startSeconds: number;
  endSeconds: number | null;
};

export function youtubeMaterialFileName(videoId: string) {
  return `youtube-${videoId}.txt`;
}

export function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function cleanTranscript(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\[.*?\]/g, "")
    .trim()
    .slice(0, 7000);
}

async function fetchTranscript(videoId: string) {
  const transcriptFromPackage = await fetchTranscriptFromPackage(videoId);
  if (transcriptFromPackage) return transcriptFromPackage;

  const pageResponse = await fetch(
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!pageResponse.ok) return "";

  const page = await pageResponse.text();
  const captionMatch = page.match(/"captionTracks":(\[[\s\S]*?\])(?:,"audioTracks"|,\"audioTracks\")/);
  if (!captionMatch) return "";

  let tracks: Array<{ baseUrl?: string; languageCode?: string }> = [];
  try {
    tracks = JSON.parse(captionMatch[1].replace(/\\u0026/g, "&")) as typeof tracks;
  } catch {
    return "";
  }

  const track =
    tracks.find((item) => item.languageCode?.toLowerCase().startsWith("en")) ||
    tracks[0];
  if (!track?.baseUrl) return "";

  const captionUrl = new URL(track.baseUrl);
  captionUrl.searchParams.set("fmt", "json3");
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) return "";

  const body = (await captionResponse.json().catch(() => null)) as {
    events?: Array<{ segs?: Array<{ utf8?: string }> }>;
  } | null;
  return cleanTranscript(
    (body?.events || [])
      .flatMap((event) => event.segs || [])
      .map((segment) => segment.utf8 || "")
      .join(" "),
  );
}

async function fetchTranscriptFromPackage(videoId: string) {
  for (const config of [{ lang: "en" }, undefined] as const) {
    try {
      const segments = await fetchYouTubeTranscript(videoId, config);
      const transcript = cleanTranscript(segments.map((segment) => segment.text).join(" "));
      if (transcript) return transcript;
    } catch {
      // Try the next language/source before reporting that captions are unavailable.
    }
  }

  return "";
}

export async function fetchTranscriptSegments(
  videoId: string,
): Promise<YouTubeTranscriptSegment[]> {
  for (const config of [{ lang: "en" }, undefined] as const) {
    try {
      const segments = await fetchYouTubeTranscript(videoId, config);
      const timed = segments
        .map((segment) => {
          const text = segment.text.replace(/\s+/g, " ").trim();
          if (!text) return null;
          const startSeconds =
            typeof segment.offset === "number" && Number.isFinite(segment.offset)
              ? segment.offset
              : 0;
          const duration =
            typeof segment.duration === "number" && Number.isFinite(segment.duration)
              ? segment.duration
              : null;
          return {
            text,
            startSeconds,
            endSeconds: duration === null ? null : startSeconds + duration,
          };
        })
        .filter((segment): segment is YouTubeTranscriptSegment => segment !== null);

      if (timed.length > 0) return timed;
    } catch {
      // Try the next language/source before falling back to plain text.
    }
  }

  const transcript = await fetchTranscript(videoId);
  if (!transcript) return [];

  return [{ text: transcript, startSeconds: 0, endSeconds: null }];
}

export async function getYouTubeVideoContext(value: string): Promise<YouTubeVideoContext> {
  const id = getYouTubeVideoId(value);
  if (!id) throw new Error("Enter a valid YouTube watch, Shorts, or youtu.be URL.");

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const metadataResponse = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  const metadata = (await metadataResponse.json().catch(() => null)) as {
    title?: string;
    author_name?: string;
  } | null;
  const segments = await fetchTranscriptSegments(id);
  const transcript = cleanTranscript(segments.map((segment) => segment.text).join(" "));

  if (!transcript) {
    throw new Error(
      "This YouTube video does not expose readable captions. Choose a video with captions enabled.",
    );
  }

  return {
    id,
    url,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
    title: metadata?.title || "YouTube lesson",
    author: metadata?.author_name || "YouTube creator",
    transcript,
  };
}
