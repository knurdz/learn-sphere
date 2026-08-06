import { describe, expect, it } from "vitest";
import {
  parseLearningPayload,
  redactLearningPayload,
  sortLearningFeedItems,
  scoreLearningAttempt,
} from "./learning-feed";

describe("learning feed payloads", () => {
  const quiz = {
    question: "Which option is correct?",
    options: ["A", "B", "C", "D"],
    correct_index: 2,
    explanation: "C is supported by the source.",
  };

  it("redacts answers before feed delivery", () => {
    expect(redactLearningPayload("quiz", quiz)).toEqual({
      question: quiz.question,
      options: quiz.options,
    });
    expect(
      redactLearningPayload("fill_blank", {
        prompt: "The key term is ____.",
        answer: "photosynthesis",
        explanation: "Plants convert light into energy.",
      }),
    ).toEqual({ prompt: "The key term is ____." });
  });

  it("scores quiz and true/false attempts", () => {
    expect(scoreLearningAttempt("quiz", quiz, 2)).toMatchObject({
      score: 100,
      correct: true,
      correctIndex: 2,
    });
    expect(
      scoreLearningAttempt(
        "true_false",
        { statement: "A", is_true: false, explanation: "B" },
        false,
      ),
    ).toMatchObject({ score: 100, correct: true });
    expect(
      scoreLearningAttempt(
        "fill_blank",
        {
          prompt: "Plants use ____ to make food.",
          answer: "sunlight",
          explanation: "Light powers photosynthesis.",
        },
        "sunlight",
      ),
    ).toMatchObject({ score: 100, correct: true, answer: "sunlight" });
  });

  it("rejects malformed payloads", () => {
    expect(() => parseLearningPayload("quiz", { question: "missing options" })).toThrow();
    expect(() => scoreLearningAttempt("quiz", quiz, 4)).toThrow();
  });

  it("prioritizes uncompleted cards while preserving newest-first order", () => {
    const items = [
      { id: "completed-new", createdAt: "2026-02-02", progress: { completedAt: "2026-02-03" } },
      { id: "uncompleted-old", createdAt: "2026-01-01", progress: { completedAt: null } },
      { id: "uncompleted-new", createdAt: "2026-02-01", progress: { completedAt: null } },
    ];

    expect(sortLearningFeedItems(items).map((item) => item.id)).toEqual([
      "uncompleted-new",
      "uncompleted-old",
      "completed-new",
    ]);
  });
});
