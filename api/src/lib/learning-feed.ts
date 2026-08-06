import { z } from "zod";
import type { Json, LearningFeedKind } from "@/lib/supabase/database";

export const learningFeedKinds = [
  "meme",
  "quiz",
  "flashcard",
  "fill_blank",
  "true_false",
  "did_you_know",
] as const satisfies readonly LearningFeedKind[];

const memePayloadSchema = z.object({
  template_id: z.string().min(1),
  captions: z.record(z.string(), z.string()),
});

const flashcardPayloadSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});

const fillBlankPayloadSchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().min(1),
});

const trueFalsePayloadSchema = z.object({
  statement: z.string().min(1),
  is_true: z.boolean(),
  explanation: z.string().min(1),
});

const quizPayloadSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});

const didYouKnowPayloadSchema = z.object({
  headline: z.string().min(1),
  fact: z.string().min(1),
  concept: z.string().min(1),
});

export type MemePayload = z.infer<typeof memePayloadSchema>;
export type FlashcardPayload = z.infer<typeof flashcardPayloadSchema>;
export type FillBlankPayload = z.infer<typeof fillBlankPayloadSchema>;
export type TrueFalsePayload = z.infer<typeof trueFalsePayloadSchema>;
export type QuizPayload = z.infer<typeof quizPayloadSchema>;
export type DidYouKnowPayload = z.infer<typeof didYouKnowPayloadSchema>;

export type LearningPayload =
  | MemePayload
  | FlashcardPayload
  | FillBlankPayload
  | TrueFalsePayload
  | QuizPayload
  | DidYouKnowPayload;

export function parseLearningPayload(
  kind: LearningFeedKind,
  value: unknown,
): LearningPayload {
  switch (kind) {
    case "meme":
      return memePayloadSchema.parse(value);
    case "flashcard":
      return flashcardPayloadSchema.parse(value);
    case "fill_blank":
      return fillBlankPayloadSchema.parse(value);
    case "true_false":
      return trueFalsePayloadSchema.parse(value);
    case "quiz":
      return quizPayloadSchema.parse(value);
    case "did_you_know":
      return didYouKnowPayloadSchema.parse(value);
  }
}

export function redactLearningPayload(
  kind: LearningFeedKind,
  value: unknown,
): Json {
  if (kind === "fill_blank") {
    const payload = fillBlankPayloadSchema.parse(value);
    return {
      prompt: payload.prompt,
    } as Json;
  }

  if (kind === "true_false") {
    const payload = trueFalsePayloadSchema.parse(value);
    return {
      statement: payload.statement,
    } as Json;
  }

  if (kind === "quiz") {
    const payload = quizPayloadSchema.parse(value);
    return {
      question: payload.question,
      options: payload.options,
    } as Json;
  }

  return parseLearningPayload(kind, value) as Json;
}

export function scoreLearningAttempt(
  kind: LearningFeedKind,
  value: unknown,
  answer: unknown,
) {
  if (kind === "quiz") {
    const payload = quizPayloadSchema.parse(value);
    const parsedAnswer = z.number().int().min(0).max(3).safeParse(answer);
    if (!parsedAnswer.success) throw new Error("Choose one quiz option.");
    return {
      score: parsedAnswer.data === payload.correct_index ? 100 : 0,
      correct: parsedAnswer.data === payload.correct_index,
      correctIndex: payload.correct_index,
      explanation: payload.explanation,
    };
  }

  if (kind === "true_false") {
    const payload = trueFalsePayloadSchema.parse(value);
    const parsedAnswer = z.boolean().safeParse(answer);
    if (!parsedAnswer.success) throw new Error("Choose true or false.");
    return {
      score: parsedAnswer.data === payload.is_true ? 100 : 0,
      correct: parsedAnswer.data === payload.is_true,
      correctAnswer: payload.is_true,
      explanation: payload.explanation,
    };
  }

  if (kind === "fill_blank") {
    const payload = fillBlankPayloadSchema.parse(value);
    const parsedAnswer = z.string().trim().min(1).safeParse(answer);
    if (!parsedAnswer.success) throw new Error("Enter an answer first.");
    const correct = parsedAnswer.data.toLowerCase() === payload.answer.toLowerCase();
    return {
      score: correct ? 100 : 0,
      correct,
      correctAnswer: payload.answer,
      answer: payload.answer,
      explanation: payload.explanation,
    };
  }

  throw new Error("This learning item does not accept an attempt.");
}

export function learningArtifactTitle(kind: LearningFeedKind) {
  return {
    meme: "Learning meme",
    quiz: "Quick quiz",
    flashcard: "Flashcard",
    fill_blank: "Fill in the blank",
    true_false: "True or false",
    did_you_know: "Did you know?",
  }[kind];
}

export function sortLearningFeedItems<
  T extends {
    createdAt: string;
    progress: { completedAt: string | null };
  },
>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftCompleted = left.progress.completedAt ? 1 : 0;
    const rightCompleted = right.progress.completedAt ? 1 : 0;
    if (leftCompleted !== rightCompleted) return leftCompleted - rightCompleted;
    return right.createdAt.localeCompare(left.createdAt);
  });
}
