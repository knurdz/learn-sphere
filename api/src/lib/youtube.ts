import { fetchTranscript as fetchYouTubeTranscript } from "youtube-transcript";
import ytdl from "@distube/ytdl-core";
import { transcribeFile } from "@/lib/providers/groq";

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

function mimeTypeFromFormat(
  format: {
    mimeType?: string;
    container?: string;
    codecs?: string;
  } | null,
) {
  const mime = format?.mimeType?.split(";")[0]?.trim();
  if (mime) return mime;

  if (format?.container === "mp4") return "audio/mp4";
  if (format?.container === "webm") return "audio/webm";
  if (format?.container === "m4a") return "audio/mp4";
  if (format?.container === "mp3") return "audio/mpeg";

  return "audio/webm";
}

async function fetchTranscriptSegmentsFromAudio(
  videoId: string,
): Promise<YouTubeTranscriptSegment[]> {
  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const info = await ytdl.getInfo(videoUrl);
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: "audioonly",
  });

  if (!audioFormat?.url) return [];

  const audioResponse = await fetch(audioFormat.url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!audioResponse.ok) return [];

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  if (audioBuffer.length === 0) return [];

  const mimeType = mimeTypeFromFormat(audioFormat);
  const extension = mimeType.includes("mp4")
    ? "m4a"
    : mimeType.includes("mpeg")
      ? "mp3"
      : "webm";
  const segments = await transcribeFile({
    buffer: audioBuffer,
    fileName: `youtube-${videoId}.${extension}`,
    mimeType,
    language: "en",
  });

  return segments
    .map((segment) => {
      const text = segment.text.replace(/\s+/g, " ").trim();
      if (!text) return null;
      return {
        text,
        startSeconds:
          typeof segment.startSeconds === "number" && Number.isFinite(segment.startSeconds)
            ? segment.startSeconds
            : 0,
        endSeconds:
          typeof segment.endSeconds === "number" && Number.isFinite(segment.endSeconds)
            ? segment.endSeconds
            : null,
      };
    })
    .filter((segment): segment is YouTubeTranscriptSegment => segment !== null);
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
  if (transcript) {
    return [{ text: transcript, startSeconds: 0, endSeconds: null }];
  }

  try {
    const segments = await fetchTranscriptSegmentsFromAudio(videoId);
    if (segments.length > 0) return segments;
  } catch {
    // If both captions and audio transcription fail, return empty and let callers surface a message.
  }

  return [];
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
      "This YouTube video could not be read from captions or audio transcription. Try another video URL.",
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
