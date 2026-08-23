"""Strip Gemma-4 channel markers that LiveKit Inference leaves in TTS text."""

from __future__ import annotations

import re

# Gemma-4 can emit <|channel>thought … <channel|> and <|channel>speech …
# LiveKit only strips the thought channel; speech openers become spoken "speech".
_CHANNEL_BLOCK = re.compile(
    r"<\|channel>(?P<name>\w+)\s*.*?<channel\|>",
    re.DOTALL,
)
_CHANNEL_OPEN = re.compile(r"<\|channel>\w+\s*")
_CHANNEL_CLOSE = re.compile(r"<channel\|>")
_JSON_FIELD = re.compile(
    r"""\{\s*["']?(?P<name>speech|thought)["']?\s*:\s*(?:["'](?P<quoted>.*?)["']|(?P<bare>[^}]*))\s*\}""",
    re.DOTALL | re.IGNORECASE,
)
_LEFTOVER_SPEECH_OPEN = re.compile(
    r"""^\s*\{?\s*["']?speech["']?\s*:?\s*["']?""",
    re.IGNORECASE,
)
_LEFTOVER_TRAILING_JSON = re.compile(r"""["']?\s*\}\s*$""")


def _replace_json_field(match: re.Match[str]) -> str:
    if match.group("name").lower() == "thought":
        return ""
    # Keep quoted speech body as-is (including internal spaces). Only trim bare
    # fields that may carry surrounding braces/noise.
    if match.group("quoted") is not None:
        return match.group("quoted")
    return (match.group("bare") or "").strip()


def scrub_gemma_channels(text: str, *, strip_edges: bool = True) -> str:
    """Remove Gemma channel wrappers so TTS never speaks the channel name.

    When ``strip_edges`` is False (streaming TTS / transcription deltas), leading
    and trailing whitespace on the chunk is preserved so token spaces survive.
    """
    text = _CHANNEL_BLOCK.sub(
        lambda match: "" if match.group("name") == "thought" else match.group(0),
        text,
    )
    text = _CHANNEL_OPEN.sub("", text)
    text = _CHANNEL_CLOSE.sub("", text)
    text = _JSON_FIELD.sub(_replace_json_field, text)
    text = _LEFTOVER_SPEECH_OPEN.sub("", text)
    text = _LEFTOVER_TRAILING_JSON.sub("", text)
    if strip_edges:
        return text.strip().lstrip('{}"')
    return text
