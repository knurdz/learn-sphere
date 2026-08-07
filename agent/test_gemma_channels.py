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


if __name__ == "__main__":
    unittest.main()
