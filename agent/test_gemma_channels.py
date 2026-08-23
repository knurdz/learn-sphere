"""Tests for Gemma channel scrubbing."""

import unittest

from gemma_channels import scrub_gemma_channels


class ScrubGemmaChannelsTest(unittest.TestCase):
    def test_strips_thought_and_speech_channel_openers(self) -> None:
        raw = (
            "<|channel>thought\nPlanning the greeting.<channel|>\n"
            "<|channel>speech\n"
            "Hello! I am ready to make this lesson clear and engaging."
        )
        self.assertEqual(
            scrub_gemma_channels(raw),
            "Hello! I am ready to make this lesson clear and engaging.",
        )

    def test_leaves_plain_text_unchanged(self) -> None:
        plain = "What would you like to explore first?"
        self.assertEqual(scrub_gemma_channels(plain), plain)

    def test_strips_json_speech_wrappers(self) -> None:
        self.assertEqual(
            scrub_gemma_channels('{speech:"Hello there."}'),
            "Hello there.",
        )
        self.assertEqual(
            scrub_gemma_channels('{ "speech": "Let us begin." }'),
            "Let us begin.",
        )

    def test_drops_json_thought_and_speech_label(self) -> None:
        self.assertEqual(
            scrub_gemma_channels('{thought:"planning"} {speech:"Hi."}'),
            "Hi.",
        )
        self.assertEqual(scrub_gemma_channels('{speech:"}Hello'), "Hello")

    def test_stream_chunks_keep_leading_spaces(self) -> None:
        self.assertEqual(
            scrub_gemma_channels(" Hello", strip_edges=False),
            " Hello",
        )
        self.assertEqual(
            scrub_gemma_channels(" course", strip_edges=False),
            " course",
        )

    def test_complete_utterance_still_strips_edges_by_default(self) -> None:
        self.assertEqual(scrub_gemma_channels("  Hello there.  "), "Hello there.")


if __name__ == "__main__":
    unittest.main()
