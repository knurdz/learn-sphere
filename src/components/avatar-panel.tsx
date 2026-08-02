"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type TranscriptionSegment,
} from "livekit-client";

type AvatarMode = "tutor" | "video_create" | "video_engage" | "youtube_tutor";

type SessionInfo = {
  agentId: string;
  transport: "livekit" | "iframe";
  url: string;
  callId?: string;
  livekitUrl?: string;
  livekitToken?: string;
  webcamVisionEnabled?: boolean;
};

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubeApi = {
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
  };
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const CHECKPOINT_SECONDS = 90;
let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube is only available in the browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const existingScript = document.getElementById("youtube-iframe-api");
    const finish = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player API did not load."));
    };

    window.onYouTubeIframeAPIReady = finish;
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the YouTube player."));
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

export function AvatarPanel({
  studySpaceId,
  mode = "tutor",
  brief = "",
  youtubeUrl = "",
}: {
  studySpaceId: string;
  mode?: AvatarMode;
  brief?: string;
  youtubeUrl?: string;
}) {
  const agentId = process.env.NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID;
  const isConfigured = Boolean(agentId && !agentId.startsWith("your-"));
  const [status, setStatus] = useState("Ready");
  const [sessionAgentId, setSessionAgentId] = useState("");
  const [sessionTransport, setSessionTransport] = useState<"livekit" | "iframe" | "">("");
  const [sessionUrl, setSessionUrl] = useState("");
  const [webcamVisionEnabled, setWebcamVisionEnabled] = useState(false);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [focusPrompt, setFocusPrompt] = useState("");
  const [cameraNotice, setCameraNotice] = useState("");
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const youtubeHolderRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const youtubeApiRef = useRef<YouTubeApi | null>(null);
  const nextCheckpointRef = useRef(CHECKPOINT_SECONDS);
  const sessionAgentIdRef = useRef("");
  const isTeachingTool =
    mode === "video_create" || mode === "video_engage" || mode === "youtube_tutor";
  const isInteractiveYoutubeMode = mode === "video_engage" || mode === "youtube_tutor";
  const youtubeVideoId = getYouTubeVideoId(youtubeUrl);
  const title =
    mode === "video_create"
      ? "Create a teaching video"
      : mode === "youtube_tutor"
        ? "Teach this YouTube video"
      : mode === "video_engage"
        ? "Make the lesson engaging"
        : "Ask with your voice";

  const sendAgentText = useCallback(async (message: string) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.sendText(message, { topic: "lk.chat" });
    } catch {
      // The avatar may be reconnecting; the video controls still work locally.
    }
  }, []);

  const pauseVideoWithPrompt = useCallback(
    (reason: "checkpoint" | "attention", notifyAgent = true) => {
      const player = playerRef.current;
      const youtubeApi = youtubeApiRef.current;
      if (!player || !youtubeApi) return false;
      if (player.getPlayerState() !== youtubeApi.PlayerState.PLAYING) return false;

      const currentTime = Math.floor(player.getCurrentTime());
      player.pauseVideo();
      setYoutubePlaying(false);
      setFocusPrompt(
        reason === "checkpoint"
          ? "The video is paused for a learning check. Answer the avatar's question, then continue."
          : "The video is paused so we can bring your attention back to the lesson.",
      );
      nextCheckpointRef.current = currentTime + CHECKPOINT_SECONDS;

      if (notifyAgent) {
        void sendAgentText(
          reason === "checkpoint"
            ? `[LEARNING CHECKPOINT] The YouTube video is paused at about ${currentTime} seconds. Ask the learner exactly one short question about the video, wait for their answer, give brief feedback, and tell them they may continue.`
            : `[ATTENTION CHECK] The YouTube video is paused because the learner left the study page. Welcome them back, ask them to focus on the lesson, and ask one short recall question about the last section.`,
        );
      }
      return true;
    },
    [sendAgentText],
  );

  const continueVideo = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.playVideo();
    setYoutubePlaying(true);
    setFocusPrompt("");
    nextCheckpointRef.current = Math.floor(player.getCurrentTime()) + CHECKPOINT_SECONDS;
    void sendAgentText(
      "[VIDEO CONTINUED] The learner has answered or is ready to continue. Briefly acknowledge and let the lesson proceed.",
    );
  }, [sendAgentText]);

  useEffect(() => {
    const holder = youtubeHolderRef.current;
    if (!youtubeVideoId || !holder) return;

    let cancelled = false;
    setYoutubeReady(false);
    setYoutubePlaying(false);
    setFocusPrompt("");

    void loadYouTubeApi()
      .then((youtubeApi) => {
        if (cancelled || !youtubeHolderRef.current) return;
        youtubeApiRef.current = youtubeApi;
        const player = new youtubeApi.Player(youtubeHolderRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setYoutubeReady(true);
              nextCheckpointRef.current = CHECKPOINT_SECONDS;
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const playing = event.data === youtubeApi.PlayerState.PLAYING;
              setYoutubePlaying(playing);
              if (playing && nextCheckpointRef.current <= 0) {
                nextCheckpointRef.current = Math.floor(player.getCurrentTime()) + CHECKPOINT_SECONDS;
              }
            },
          },
        });
        playerRef.current = player;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Could not load the YouTube player.");
        }
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      youtubeApiRef.current = null;
    };
  }, [youtubeVideoId]);

  useEffect(() => {
    if (!isInteractiveYoutubeMode || !youtubeVideoId) return;

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      const youtubeApi = youtubeApiRef.current;
      if (!player || !youtubeApi || !youtubePlaying) return;
      if (
        player.getPlayerState() === youtubeApi.PlayerState.PLAYING &&
        player.getCurrentTime() >= nextCheckpointRef.current
      ) {
        pauseVideoWithPrompt("checkpoint");
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isInteractiveYoutubeMode, pauseVideoWithPrompt, youtubePlaying, youtubeVideoId]);

  useEffect(() => {
    if (!isInteractiveYoutubeMode || !youtubeVideoId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) pauseVideoWithPrompt("attention");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isInteractiveYoutubeMode, pauseVideoWithPrompt, youtubeVideoId]);

  async function deleteServerSession(agentToDelete: string) {
    if (!agentToDelete) return;
    await fetch("/api/beyond-presence/session", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agentToDelete }),
    }).catch(() => undefined);
  }

  async function startSession() {
    setStatus("Creating your teaching avatar...");
    setCameraNotice("");
    try {
      const response = await fetch("/api/beyond-presence/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studySpaceId, mode, brief, youtubeUrl }),
      });
      const result = (await response.json()) as {
        error?: string;
        session?: SessionInfo;
      };
      if (!response.ok) throw new Error(result.error || "Connection failed.");
      const session = result.session;
      if (!session?.agentId || !session.url || !session.transport) {
        throw new Error("Beyond Presence did not return a usable teaching session.");
      }

      sessionAgentIdRef.current = session.agentId;
      setSessionAgentId(session.agentId);
      setSessionTransport(session.transport);
      setSessionUrl(session.url);
      setWebcamVisionEnabled(Boolean(session.webcamVisionEnabled));

      if (session.transport === "iframe") {
        setStatus("Connected (managed avatar)");
        return;
      }
      if (!session.livekitUrl || !session.livekitToken) {
        throw new Error("Beyond Presence did not return LiveKit connection credentials.");
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const attachRemoteTrack = (track: RemoteTrack) => {
        const container = mediaContainerRef.current;
        if (!container) return;
        const element = track.attach();
        element.className =
          track.kind === Track.Kind.Video
            ? "h-full w-full rounded-2xl object-cover"
            : "absolute h-px w-px opacity-0";
        container.appendChild(element);
      };
      const detachRemoteTrack = (track: RemoteTrack) => {
        track.detach().forEach((element) => element.remove());
      };
      const handleAgentTranscription = (
        segments: TranscriptionSegment[],
        participant?: Participant,
      ) => {
        if (!participant?.isAgent) return;
        const text = segments.map((segment) => segment.text).join(" ").toLowerCase();
        if (text.includes("pause the video") || text.includes("pause the lesson")) {
          pauseVideoWithPrompt("attention", false);
        }
      };

      room.on(RoomEvent.TrackSubscribed, attachRemoteTrack);
      room.on(RoomEvent.TrackUnsubscribed, detachRemoteTrack);
      room.on(RoomEvent.TranscriptionReceived, handleAgentTranscription);
      room.on(RoomEvent.Disconnected, () => setStatus("Disconnected — you can reconnect when ready."));

      await room.connect(session.livekitUrl, session.livekitToken);
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          if (publication.isSubscribed && publication.track) {
            attachRemoteTrack(publication.track);
          }
        }
      }

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        setCameraNotice("Microphone permission was not granted. Allow it in the browser to speak to the avatar.");
      }

      if (session.webcamVisionEnabled) {
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch {
          setCameraNotice(
            "Camera attention monitoring is unavailable, but the avatar and video controls are still active.",
          );
        }
      }

      setStatus("Connected");
    } catch (error) {
      roomRef.current?.disconnect();
      roomRef.current = null;
      const agentToDelete = sessionAgentIdRef.current;
      sessionAgentIdRef.current = "";
      setSessionAgentId("");
      setSessionTransport("");
      setSessionUrl("");
      await deleteServerSession(agentToDelete);
      setStatus(error instanceof Error ? error.message : "Connection failed.");
    }
  }

  async function stopSession() {
    setStatus("Stopping lesson...");
    const room = roomRef.current;
    roomRef.current = null;
    room?.disconnect();
    const agentToDelete = sessionAgentIdRef.current;
    sessionAgentIdRef.current = "";
    setSessionAgentId("");
    setSessionTransport("");
    setSessionUrl("");
    setWebcamVisionEnabled(false);
    mediaContainerRef.current?.replaceChildren();
    await deleteServerSession(agentToDelete);
    setStatus("Ready");
  }

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      void deleteServerSession(sessionAgentIdRef.current);
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            {isTeachingTool ? "Teaching avatar" : "Live tutor"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
          Avatar + voice
        </span>
      </div>
      {isConfigured ? (
        <div className="p-5">
          <p className="mb-4 text-sm text-slate-300">{status}</p>
          {sessionAgentId ? (
            <button
              onClick={stopSession}
              className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Stop teaching session
            </button>
          ) : (
            <button
              onClick={startSession}
              className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              {isTeachingTool ? "Start avatar lesson" : "Start interactive tutor"}
            </button>
          )}

          {sessionAgentId ? (
            <div className="mt-5">
              {sessionTransport === "livekit" ? (
                <>
                  <div
                    ref={mediaContainerRef}
                    className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
                  />
                  <p className="mt-3 text-xs text-slate-400">
                    The avatar is connected directly through LiveKit. Speak naturally; the avatar listens through your microphone.
                  </p>
                </>
              ) : (
                <>
                  <iframe
                    className="aspect-video w-full rounded-2xl border border-white/10"
                    src={sessionUrl}
                    title="Beyond Presence teaching avatar"
                    allow="camera; microphone; fullscreen"
                    allowFullScreen
                  />
                  <p className="mt-3 text-xs text-slate-400">
                    Your account is using the managed Beyond Presence session. After the page pauses, ask the avatar out loud: “Ask me a question about what we just watched.”
                  </p>
                </>
              )}
              {webcamVisionEnabled ? (
                <p className="mt-2 text-xs text-emerald-300">
                  Camera attention monitoring is enabled for this engagement session.
                </p>
              ) : null}
            </div>
          ) : null}

          {cameraNotice ? <p className="mt-3 text-xs text-amber-300">{cameraNotice}</p> : null}

          {youtubeVideoId ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Interactive YouTube lesson</p>
                <span className="text-xs text-slate-400">
                  {isInteractiveYoutubeMode ? "Checkpoint every 90 seconds" : "Source video"}
                </span>
              </div>
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <div ref={youtubeHolderRef} className="h-full w-full" />
              </div>
              {isInteractiveYoutubeMode ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (!playerRef.current) return;
                        if (youtubePlaying) {
                          playerRef.current.pauseVideo();
                          setYoutubePlaying(false);
                        } else {
                          playerRef.current.playVideo();
                          setYoutubePlaying(true);
                        }
                      }}
                      disabled={!youtubeReady}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {youtubePlaying ? "Pause video" : "Play video"}
                    </button>
                    <button
                      onClick={() => pauseVideoWithPrompt("checkpoint")}
                      disabled={!youtubeReady || !youtubePlaying}
                      className="rounded-xl border border-indigo-300/40 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Pause & ask avatar
                    </button>
                  </div>
                  {focusPrompt ? (
                    <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                      <p>{focusPrompt}</p>
                      <button
                        onClick={continueVideo}
                        className="mt-3 rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-100"
                      >
                        Continue video
                      </button>
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-400">
                    The page pauses the video for learning checks. If the avatar says “pause the video” after detecting a distraction, the page pauses it too when using LiveKit.
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500 text-2xl font-bold text-white">
            L
          </div>
          <h3 className="mt-5 text-xl font-semibold text-white">Connect your Beyond Presence agent</h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Add NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID and BEYOND_PRESENCE_API_KEY to .env.local. LearnSphere creates a temporary teaching agent with the selected study-space context.
          </p>
        </div>
      )}
    </section>
  );
}

function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] || "";
    }
  } catch {
    return "";
  }
  return "";
}
