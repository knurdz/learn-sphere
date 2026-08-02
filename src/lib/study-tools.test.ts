import { describe, expect, it } from "vitest";
import {
  parseGeneratedStudyArtifact,
  type VideoCreatePayload,
  type VideoEngagePayload,
} from "./study-tools";

describe("study tool payloads", () => {
  it("parses a scratch video blueprint without source material", () => {
    const payload = parseGeneratedStudyArtifact(
      "video_create",
      JSON.stringify({
        title: "Photosynthesis in three minutes",
        audience: "Early secondary students",
        duration_seconds: 180,
        hook: "How do plants make their own food?",
        scenes: [
          {
            id: "scene-1",
            title: "The question",
            duration_seconds: 30,
            visual_direction: "Show a plant in sunlight.",
            narration: "Plants use light energy to make food.",
            on_screen_text: "Light + water + carbon dioxide",
          },
        ],
        call_to_action: "Explain the process in your own words.",
      }),
    ) as VideoCreatePayload;

    expect(payload.scenes).toHaveLength(1);
    expect(payload.scenes[0].source_ids).toEqual([]);
  });

  it("parses an indexed-video engagement plan", () => {
    const payload = parseGeneratedStudyArtifact(
      "video_engage",
      JSON.stringify({
        material_id: "11111111-1111-4111-8111-111111111111",
        title: "More engaging lesson plan",
        opening_hook: "Pause and predict what happens next.",
        strategy: "Add prediction moments before each concept change.",
        chapters: [{ timestamp_seconds: 0, title: "Introduction" }],
        engagement_moments: [
          {
            timestamp_seconds: 30,
            title: "Prediction pause",
            technique: "Active recall",
            suggested_edit: "Cut to a question card for five seconds.",
            learner_prompt: "What do you think happens next?",
          },
        ],
        closing_cta: "Summarize the key idea before moving on.",
      }),
    ) as VideoEngagePayload;

    expect(payload.material_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(payload.engagement_moments[0].timestamp_seconds).toBe(30);
  });
});
