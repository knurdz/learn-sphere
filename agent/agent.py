"""LiveKit Agents worker that teaches with a Beyond Presence avatar.

The Next.js bridge mints a learner token that dispatches this worker into the
room and hands it the study-space briefing through the dispatch metadata. The
worker owns the conversation loop (speech to text, LLM, text to speech) and the
Beyond Presence avatar renders the lip-synced video into the same room.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import AsyncGenerator, AsyncIterable

import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    ConversationItemAddedEvent,
    JobContext,
    TurnHandlingOptions,
    inference,
)
from livekit.agents.voice import agent as voice_agent
from livekit.plugins import bey

from gemma_channels import scrub_gemma_channels

load_dotenv(".env.local")

logger = logging.getLogger("learnsphere-tutor")

# Must match TUTOR_AGENT_NAME in api/src/lib/providers/livekit.ts.
AGENT_NAME = "learnsphere-tutor"

API_BASE = os.getenv("LEARNSPHERE_API_URL", "http://127.0.0.1:3000").rstrip("/")
STT_MODEL = os.getenv("TUTOR_STT_MODEL", "deepgram/nova-3")
LLM_MODEL = os.getenv("TUTOR_LLM_MODEL", "google/gemma-4-31b-it")
DEFAULT_TTS_MODEL = os.getenv("TUTOR_TTS_MODEL", "inworld/inworld-tts-2")
DEFAULT_TTS_VOICE = os.getenv("TUTOR_TTS_VOICE", "Ashley")

FALLBACK_INSTRUCTIONS = (
    "You are the LearnSphere live tutor, appearing to the learner as a talking video avatar. "
    "The study material for this session could not be loaded, so say so plainly, then help the "
    "learner as best you can from general knowledge. Keep spoken replies to a few sentences."
)
FALLBACK_GREETING = "Hello! I'm your LearnSphere tutor. What would you like to work on?"


async def _scrub_text_stream(text: AsyncIterable[str]) -> AsyncGenerator[str, None]:
    async for chunk in text:
        yield scrub_gemma_channels(chunk)


class TutorAgent(Agent):
    """Live tutor that strips Gemma-4 channel markers before speech synthesis."""

    async def tts_node(self, text, model_settings):
        scrubbed = _scrub_text_stream(text)
        async for frame in voice_agent.Agent.default.tts_node(self, scrubbed, model_settings):
            yield frame

    async def transcription_node(self, text, model_settings):
        async def scrubbed() -> AsyncGenerator[str, None]:
            async for delta in text:
                if isinstance(delta, str):
                    yield scrub_gemma_channels(delta)
                else:
                    yield delta

        async for delta in voice_agent.Agent.default.transcription_node(
            self, scrubbed(), model_settings
        ):
            yield delta


def _tts_from_dispatch(dispatch: dict[str, str]) -> inference.TTS:
    model = dispatch.get("ttsModel") or DEFAULT_TTS_MODEL
    voice = dispatch.get("ttsVoice") or DEFAULT_TTS_VOICE
    language = dispatch.get("ttsLanguage")
    if language:
        return inference.TTS(model=model, voice=voice, language=language)
    return inference.TTS(model=model, voice=voice)


def _stt_from_dispatch(dispatch: dict[str, str]) -> inference.STT:
    language = dispatch.get("sttLanguage") or "multi"
    return inference.STT(model=STT_MODEL, language=language)


server = AgentServer()


async def _fetch_briefing(
    http: aiohttp.ClientSession,
    session_id: str,
    access_token: str,
) -> dict[str, str] | None:
    """Load the teaching prompt the bridge built for this study space."""
    try:
        async with http.get(
            f"{API_BASE}/api/live-tutor/session/{session_id}/briefing",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=aiohttp.ClientTimeout(total=20),
        ) as response:
            if not response.ok:
                logger.warning(
                    "briefing request failed",
                    extra={"status": response.status, "body": await response.text()},
                )
                return None
            return await response.json()
    except Exception:
        logger.exception("could not load the session briefing")
        return None


async def _save_message(
    http: aiohttp.ClientSession,
    session_id: str,
    access_token: str,
    role: str,
    content: str,
) -> None:
    try:
        async with http.post(
            f"{API_BASE}/api/live-tutor/session/{session_id}/transcript",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"role": role, "content": content},
            timeout=aiohttp.ClientTimeout(total=20),
        ) as response:
            if not response.ok:
                logger.warning("transcript save failed", extra={"status": response.status})
    except Exception:
        logger.exception("could not save a transcript entry")


@server.rtc_session(agent_name=AGENT_NAME)
async def tutor_session(ctx: JobContext) -> None:
    dispatch: dict[str, str] = {}
    if ctx.job.metadata:
        try:
            dispatch = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            logger.warning("dispatch metadata was not valid JSON")

    session_id = dispatch.get("sessionId", "")
    access_token = dispatch.get("supabaseAccessToken", "")
    locale = dispatch.get("locale", "en")

    http = aiohttp.ClientSession()
    ctx.add_shutdown_callback(http.close)

    briefing = None
    if session_id and access_token:
        briefing = await _fetch_briefing(http, session_id, access_token)
    else:
        logger.warning("no session in the dispatch metadata; using fallback instructions")

    instructions = (briefing or {}).get("instructions") or FALLBACK_INSTRUCTIONS
    greeting = (briefing or {}).get("greeting") or FALLBACK_GREETING

    logger.info("live tutor session locale=%s stt=%s tts=%s", locale, dispatch.get("sttLanguage"), dispatch.get("ttsModel"))

    await ctx.connect()

    session = AgentSession(
        stt=_stt_from_dispatch(dispatch),
        llm=inference.LLM(model=LLM_MODEL),
        tts=_tts_from_dispatch(dispatch),
        turn_handling=TurnHandlingOptions(turn_detection=inference.TurnDetector()),
    )

    if session_id and access_token:

        @session.on("conversation_item_added")
        def _on_item(event: ConversationItemAddedEvent) -> None:
            role = getattr(event.item, "role", None)
            text = getattr(event.item, "text_content", None)
            if role not in ("user", "assistant") or not text:
                return
            asyncio.create_task(_save_message(http, session_id, access_token, role, text))

    try:
        avatar = bey.AvatarSession(avatar_id=os.getenv("BEY_AVATAR_ID") or None)
        await avatar.start(session, room=ctx.room)
    except Exception:
        # Still teach over audio if Beyond Presence is down; the app shows video when
        # the avatar track arrives and otherwise keeps an audio-only call.
        logger.exception("Beyond Presence avatar failed to start; continuing audio-only")

    await session.start(TutorAgent(instructions=instructions), room=ctx.room)
    await session.say(greeting)


if __name__ == "__main__":
    agents.cli.run_app(server)
