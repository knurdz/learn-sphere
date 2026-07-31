import { describe, expect, it } from "vitest";
import {
  parseGeneratedStudyArtifact,
  quizResult,
  type PracticeTestPayload,
} from "./study-tools";

describe("study tool payloads", () => {
  it("parses a fenced practice test and keeps its answer key", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const payload = parseGeneratedStudyArtifact(
      "practice_test",
      [
        fence + "json",
        JSON.stringify({
          questions: [
            {
              id: "q1",
              prompt: "What is 2 + 2?",
              options: ["3", "4"],
              correct_index: 1,
              explanation: "Adding two and two gives four.",
              source_ids: ["chunk-1"],
            },
          ],
        }),
        fence,
      ].join("\n"),
    ) as PracticeTestPayload;

    expect(payload.questions[0].correct_index).toBe(1);
  });

  it("calculates a percentage and per-question feedback", () => {
    const payload: PracticeTestPayload = {
      questions: [
        {
          id: "q1",
          prompt: "First",
          options: ["A", "B"],
          correct_index: 0,
          explanation: "A is correct.",
          source_ids: [],
        },
        {
          id: "q2",
          prompt: "Second",
          options: ["A", "B"],
          correct_index: 1,
          explanation: "B is correct.",
          source_ids: [],
        },
      ],
    };

    expect(quizResult(payload, { q1: 0, q2: 0 })).toEqual({
      score: 50,
      correctCount: 1,
      total: 2,
      feedback: [
        {
          questionId: "q1",
          correct: true,
          correctIndex: 0,
          explanation: "A is correct.",
        },
        {
          questionId: "q2",
          correct: false,
          correctIndex: 1,
          explanation: "B is correct.",
        },
      ],
    });
  });
});
