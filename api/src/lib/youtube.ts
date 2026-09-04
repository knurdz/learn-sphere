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

export type YouTubeVideoSource = YouTubeVideoContext & {
  segments: YouTubeTranscriptSegment[];
};

export class YouTubeCaptionsMissingError extends Error {
  readonly code = "YOUTUBE_CAPTIONS_MISSING" as const;

  constructor(
    message = "This YouTube video has no captions. Generating a quiz from the audio uses extra credits.",
  ) {
    super(message);
    this.name = "YouTubeCaptionsMissingError";
  }
}

export function youtubeMaterialFileName(videoId: string) {
  return `youtube-${videoId}.txt`;
}

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
]);

const INNERTUBE_API_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const INNERTUBE_USER_AGENT =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip";
const INNERTUBE_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
  },
};

const MAX_WHISPER_BYTES = 24 * 1024 * 1024;

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  vssId?: string;
};

type InnerTubePlayerResponse = {
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
    isLiveContent?: boolean;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
  streamingData?: {
    adaptiveFormats?: DownloadableFormat[];
    formats?: DownloadableFormat[];
  };
};

type DownloadableFormat = {
  url?: string;
  itag?: number;
  mimeType?: string;
  container?: string;
  codecs?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  contentLength?: string;
  audioQuality?: string;
  bitrate?: number;
};

export function getYouTubeVideoId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (!YOUTUBE_HOSTS.has(hostname)) return null;

    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || null;
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (
      parts[0] === "shorts" ||
      parts[0] === "embed" ||
      parts[0] === "live" ||
      parts[0] === "v"
    ) {
      const id = parts[1] || null;
      return id && VIDEO_ID_PATTERN.test(id) ? id : null;
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

function languagePrefix(code: string | undefined) {
  return (code || "").toLowerCase().split(/[-_]/)[0];
}

function playabilityErrorMessage(status: string | undefined, reason: string | undefined) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "LOGIN_REQUIRED") {
    return "This YouTube video requires sign-in (age-restricted or members-only) and cannot be used for quizzes.";
  }
  if (normalized === "UNPLAYABLE") {
    return reason?.trim() || "This YouTube video is unplayable and cannot be used for quizzes.";
  }
  if (normalized === "ERROR") {
    return reason?.trim() || "Could not load this YouTube video.";
  }
  if (normalized === "LIVE_STREAM_OFFLINE") {
    return "This live stream is offline and cannot be used for quizzes yet.";
  }
  if (normalized && normalized !== "OK") {
    return reason?.trim() || `This YouTube video cannot be used (${normalized}).`;
  }
  return null;
}

async function fetchInnerTubePlayer(videoId: string): Promise<InnerTubePlayerResponse> {
  const response = await fetch(INNERTUBE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": INNERTUBE_USER_AGENT,
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not load the YouTube video player data.");
  }

  return (await response.json()) as InnerTubePlayerResponse;
}

function chooseCaptionTrack(tracks: CaptionTrack[], preferredLanguage?: string) {
  if (tracks.length === 0) return null;

  const preferred = languagePrefix(preferredLanguage);
  if (preferred) {
    const preferredManual = tracks.find(
      (track) => languagePrefix(track.languageCode) === preferred && track.kind !== "asr",
    );
    if (preferredManual?.baseUrl) return preferredManual;

    const preferredAny = tracks.find(
      (track) => languagePrefix(track.languageCode) === preferred,
    );
    if (preferredAny?.baseUrl) return preferredAny;
  }

  const englishManual = tracks.find(
    (track) => languagePrefix(track.languageCode) === "en" && track.kind !== "asr",
  );
  if (englishManual?.baseUrl) return englishManual;

  const englishAny = tracks.find((track) => languagePrefix(track.languageCode) === "en");
  if (englishAny?.baseUrl) return englishAny;

  const asr = tracks.find((track) => track.kind === "asr" && track.baseUrl);
  if (asr) return asr;

  return tracks.find((track) => track.baseUrl) || null;
}

function parseJson3CaptionEvents(body: {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string }>;
  }>;
}): YouTubeTranscriptSegment[] {
  const segments: YouTubeTranscriptSegment[] = [];

  for (const event of body.events || []) {
    const text = (event.segs || [])
      .map((segment) => segment.utf8 || "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    const startMs = typeof event.tStartMs === "number" ? event.tStartMs : 0;
    const durationMs = typeof event.dDurationMs === "number" ? event.dDurationMs : null;
    const startSeconds = startMs / 1000;
    segments.push({
      text,
      startSeconds,
      endSeconds: durationMs === null ? null : startSeconds + durationMs / 1000,
    });
  }

  return segments;
}

async function fetchCaptionSegmentsFromTrack(
  track: CaptionTrack,
): Promise<YouTubeTranscriptSegment[]> {
  if (!track.baseUrl) return [];

  const captionUrl = new URL(track.baseUrl);
  captionUrl.searchParams.set("fmt", "json3");

  const response = await fetch(captionUrl.toString(), {
    headers: { "User-Agent": INNERTUBE_USER_AGENT },
  });
  if (!response.ok) return [];

  const body = (await response.json().catch(() => null)) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  } | null;

  if (!body) return [];
  return parseJson3CaptionEvents(body);
}

export async function fetchCaptionSegments(
  videoId: string,
  preferredLanguage?: string,
  player?: InnerTubePlayerResponse,
): Promise<YouTubeTranscriptSegment[]> {
  const data = player ?? (await fetchInnerTubePlayer(videoId));
  const playabilityMessage = playabilityErrorMessage(
    data.playabilityStatus?.status,
    data.playabilityStatus?.reason,
  );
  if (playabilityMessage) {
    throw new Error(playabilityMessage);
  }

  if (data.videoDetails?.isLiveContent && data.videoDetails.lengthSeconds === "0") {
    throw new Error("Live streams that are still in progress cannot be used for quizzes.");
  }

  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = chooseCaptionTrack(tracks, preferredLanguage);
  if (!track) return [];

  return fetchCaptionSegmentsFromTrack(track);
}

function mimeTypeFromFormat(format: DownloadableFormat | null) {
  const mime = format?.mimeType?.split(";")[0]?.trim();
  if (mime) {
    if (mime === "video/mp4") return "audio/mp4";
    if (mime === "video/webm") return "audio/webm";
    return mime;
  }

  if (format?.container === "mp4" || format?.container === "m4a") return "audio/mp4";
  if (format?.container === "webm") return "audio/webm";
  if (format?.container === "mp3") return "audio/mpeg";

  return "audio/webm";
}

function chooseDownloadableAudioFormat(formats: DownloadableFormat[]) {
  const withAudioUrl = formats.filter((format) => {
    if (!format.url) return false;
    if (format.hasAudio === false) return false;
    const mime = (format.mimeType || "").toLowerCase();
    if (mime.startsWith("audio/")) return true;
    if (format.hasAudio) return true;
    // InnerTube adaptive audio formats often omit hasAudio.
    return Boolean(format.audioQuality) || /audio\//.test(mime);
  });

  if (withAudioUrl.length === 0) return null;

  const itag18 = withAudioUrl.find((format) => format.itag === 18);
  if (itag18) return itag18;

  const audioOnlyWithUrl = withAudioUrl.find((format) => {
    const mime = (format.mimeType || "").toLowerCase();
    return mime.startsWith("audio/") || (format.hasAudio && !format.hasVideo);
  });
  if (audioOnlyWithUrl) return audioOnlyWithUrl;

  return (
    [...withAudioUrl].sort(
      (a, b) =>
        (Number(a.contentLength) || Number.POSITIVE_INFINITY) -
        (Number(b.contentLength) || Number.POSITIVE_INFINITY),
    )[0] || null
  );
}

function chooseYtdlAudioFormat(formats: DownloadableFormat[]) {
  try {
    const audioOnly = ytdl.chooseFormat(formats as never, {
      quality: "highestaudio",
      filter: "audioonly",
    }) as DownloadableFormat | undefined;
    if (audioOnly?.url) return audioOnly;
  } catch {
    // Adaptive audio-only URLs often fail when ytdl cannot decipher them.
  }

  try {
    const progressive = ytdl.chooseFormat(formats as never, {
      quality: "lowest",
      filter: (format: DownloadableFormat) => Boolean(format.hasAudio && format.url),
    }) as DownloadableFormat | undefined;
    if (progressive?.url) return progressive;
  } catch {
    // Fall through to manual selection.
  }

  return chooseDownloadableAudioFormat(formats);
}

async function downloadAndTranscribeFormat(
  videoId: string,
  audioFormat: DownloadableFormat,
): Promise<YouTubeTranscriptSegment[]> {
  if (!audioFormat.url) return [];

  const contentLength = Number(audioFormat.contentLength);
  if (Number.isFinite(contentLength) && contentLength > MAX_WHISPER_BYTES) {
    throw new Error(
      "This video is too long to transcribe without captions. Try a shorter video or one that has captions.",
    );
  }

  const audioResponse = await fetch(audioFormat.url, {
    headers: { "User-Agent": INNERTUBE_USER_AGENT },
  });
  if (!audioResponse.ok) return [];

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  if (audioBuffer.length === 0) return [];
  if (audioBuffer.length > MAX_WHISPER_BYTES) {
    throw new Error(
      "This video is too long to transcribe without captions. Try a shorter video or one that has captions.",
    );
  }

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

async function fetchTranscriptSegmentsFromAudio(
  videoId: string,
  player?: InnerTubePlayerResponse,
): Promise<YouTubeTranscriptSegment[]> {
  const data = player ?? (await fetchInnerTubePlayer(videoId));
  const innerFormats = [
    ...(data.streamingData?.adaptiveFormats || []),
    ...(data.streamingData?.formats || []),
  ];
  const innerFormat = chooseDownloadableAudioFormat(innerFormats);
  if (innerFormat?.url) {
    try {
      const segments = await downloadAndTranscribeFormat(videoId, innerFormat);
      if (segments.length > 0) return segments;
    } catch (error) {
      if (error instanceof Error && /too long to transcribe/i.test(error.message)) {
        throw error;
      }
      // Fall through to ytdl.
    }
  }

  const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const info = await ytdl.getInfo(videoUrl);
  const audioFormat = chooseYtdlAudioFormat(info.formats as DownloadableFormat[]);
  if (!audioFormat?.url) return [];
  return downloadAndTranscribeFormat(videoId, audioFormat);
}

export async function fetchTranscriptSegments(
  videoId: string,
  options: {
    preferredLanguage?: string;
    allowAudioTranscription?: boolean;
    player?: InnerTubePlayerResponse;
  } = {},
): Promise<YouTubeTranscriptSegment[]> {
  const player = options.player ?? (await fetchInnerTubePlayer(videoId));
  const captionSegments = await fetchCaptionSegments(
    videoId,
    options.preferredLanguage,
    player,
  );
  if (captionSegments.length > 0) return captionSegments;

  if (!options.allowAudioTranscription) {
    return [];
  }

  try {
    return await fetchTranscriptSegmentsFromAudio(videoId, player);
  } catch (error) {
    if (error instanceof Error && /too long to transcribe/i.test(error.message)) {
      throw error;
    }
    return [];
  }
}

async function resolveVideoMetadata(
  videoId: string,
  player?: InnerTubePlayerResponse,
): Promise<{ title: string; author: string }> {
  if (player?.videoDetails?.title) {
    return {
      title: player.videoDetails.title,
      author: player.videoDetails.author || "YouTube creator",
    };
  }

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const metadataResponse = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  const metadata = (await metadataResponse.json().catch(() => null)) as {
    title?: string;
    author_name?: string;
  } | null;

  return {
    title: metadata?.title || "YouTube lesson",
    author: metadata?.author_name || "YouTube creator",
  };
}

export async function getYouTubeVideoSource(
  value: string,
  options: {
    preferredLanguage?: string;
    allowAudioTranscription?: boolean;
  } = {},
): Promise<YouTubeVideoSource> {
  const id = getYouTubeVideoId(value);
  if (!id) throw new Error("Enter a valid YouTube watch, Shorts, or youtu.be URL.");

  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const player = await fetchInnerTubePlayer(id);
  const metadata = await resolveVideoMetadata(id, player);

  const segments = await fetchTranscriptSegments(id, {
    preferredLanguage: options.preferredLanguage,
    allowAudioTranscription: options.allowAudioTranscription,
    player,
  });
  const transcript = cleanTranscript(segments.map((segment) => segment.text).join(" "));

  if (!transcript) {
    if (!options.allowAudioTranscription) {
      throw new YouTubeCaptionsMissingError();
    }
    throw new Error(
      "This YouTube URL could not be read from captions or audio transcription. Try another public video.",
    );
  }

  return {
    id,
    url,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
    title: metadata.title,
    author: metadata.author,
    transcript,
    segments,
  };
}

export async function getYouTubeVideoContext(
  value: string,
  preferredLanguage?: string,
): Promise<YouTubeVideoContext> {
  // Live tutor auto-allows audio transcription so it does not need a confirmation dialog.
  const { segments: _segments, ...context } = await getYouTubeVideoSource(value, {
    preferredLanguage,
    allowAudioTranscription: true,
  });
  return context;
}
