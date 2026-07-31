"use client";

import { useState } from "react";
import type {
  LearningProgress,
  StudyArtifact,
  StudyArtifactKind,
  StudySpace,
} from "@/lib/supabase/database";
import type {
  ClientArtifactPayload,
  FlashcardsPayload,
  GuidePayload,
  PracticeTestPayload,
  VideoQuizPayload,
} from "@/lib/study-tools";

type ClientArtifact = Omit<StudyArtifact, "payload"> & {
  payload: ClientArtifactPayload;
};

type QuizQuestion = Omit<
  PracticeTestPayload["questions"][number],
  "correct_index" | "explanation"
> & {
  explanation?: string;
  timestamp_seconds?: number;
};

type AttemptFeedback = {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  explanation: string;
};

const toolOptions: Array<{ value: StudyArtifactKind; label: string; description: string }> = [
  {
    value: "guide",
    label: "Study guide",
    description: "A structured summary with key takeaways.",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    description: "Quick recall prompts from your indexed material.",
  },
  {
    value: "practice_test",
    label: "Practice test",
    description: "Multiple-choice questions with grounded feedback.",
  },
  {
    value: "video_quiz",
    label: "Video quiz",
    description: "Timestamped questions for an indexed lesson video.",
  },
];

function errorMessage(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }
  return "Something went wrong. Try again.";
}

export function StudyToolsWorkspace({
  studySpaces,
}: {
  studySpaces: StudySpace[];
}) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(studySpaces[0]?.id ?? "");
  const [kind, setKind] = useState<StudyArtifactKind>("guide");
  const [artifacts, setArtifacts] = useState<ClientArtifact[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<ClientArtifact | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<AttemptFeedback[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function selectArtifact(artifact: ClientArtifact | null) {
    setActiveArtifact(artifact);
    setAnswers({});
    setFeedback([]);
    setScore(null);
    setVideoUrl(null);
  }

  async function loadArtifacts(spaceId = selectedSpaceId) {
    if (!spaceId) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/study-tools?studySpaceId=" + encodeURIComponent(spaceId),
      );
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body));
      const loaded = (body.artifacts ?? []) as ClientArtifact[];
      setArtifacts(loaded);
      setProgress((body.progress ?? []) as LearningProgress[]);
      const selected = loaded.find((artifact) => artifact.kind === kind) ?? loaded[0] ?? null;
      if (selected) setKind(selected.kind);
      selectArtifact(selected);
      setMessage(loaded.length === 0 ? "No saved tools yet." : "Saved tools loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load study tools.");
    } finally {
      setBusy(false);
    }
  }

  async function generateArtifact() {
    if (!selectedSpaceId) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/study-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studySpaceId: selectedSpaceId, kind }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body));
      const generated = body.artifact as ClientArtifact;
      setArtifacts((current) => [generated, ...current]);
      selectArtifact(generated);
      setMessage("Study tool created and saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate the study tool.");
    } finally {
      setBusy(false);
    }
  }

  async function loadVideo(materialId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/materials/" + materialId + "/signed-url");
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body));
      setVideoUrl(body.url as string);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the video.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz(artifact: ClientArtifact) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/study-tools/" + artifact.id + "/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorMessage(body));
      setScore(body.score as number);
      setFeedback((body.feedback ?? []) as AttemptFeedback[]);
      setMessage("Attempt saved to your progress.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit the attempt.");
    } finally {
      setBusy(false);
    }
  }

  function renderGuide(payload: GuidePayload) {
    return (
      <div className="space-y-6">
        {payload.sections.map((section) => (
          <section key={section.title}>
            <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="rounded-2xl bg-indigo-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
            Key takeaways
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-indigo-950">
            {payload.takeaways.map((takeaway) => (
              <li key={takeaway}>• {takeaway}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  function renderFlashcards(payload: FlashcardsPayload) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {payload.cards.map((card, index) => (
          <article key={card.question + index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Card {index + 1}
            </p>
            <h3 className="mt-3 font-semibold leading-6 text-slate-900">{card.question}</h3>
            <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
              {card.answer}
            </p>
          </article>
        ))}
      </div>
    );
  }

  function renderQuiz(
    artifact: ClientArtifact,
    payload: PracticeTestPayload | VideoQuizPayload,
  ) {
    const questions = payload.questions as unknown as QuizQuestion[];
    const isVideo = artifact.kind === "video_quiz";
    const videoPayload = isVideo ? (payload as VideoQuizPayload) : null;

    return (
      <div className="space-y-6">
        {isVideo && videoPayload ? (
          <div className="rounded-2xl bg-slate-950 p-4">
            {videoUrl ? (
              <video className="aspect-video w-full rounded-xl bg-black" controls src={videoUrl} />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-center text-sm text-slate-300">
                Load the private lesson video to study alongside the quiz.
              </div>
            )}
            <button
              type="button"
              onClick={() => loadVideo(videoPayload.material_id)}
              disabled={busy}
              className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {videoUrl ? "Reload video" : "Load lesson video"}
            </button>
          </div>
        ) : null}

        {questions.map((question, index) => {
          const questionFeedback = feedback.find((item) => item.questionId === question.id);
          return (
            <fieldset key={question.id} className="rounded-2xl border border-slate-200 p-5">
              <legend className="px-1 text-sm font-semibold leading-6 text-slate-900">
                {index + 1}. {question.prompt}
                {isVideo && question.timestamp_seconds !== undefined ? (
                  <span className="ml-2 text-xs font-medium text-indigo-600">
                    around {Math.floor(question.timestamp_seconds)}s
                  </span>
                ) : null}
              </legend>
              <div className="mt-4 space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 hover:border-indigo-300"
                  >
                    <input
                      type="radio"
                      name={artifact.id + "-" + question.id}
                      checked={answers[question.id] === optionIndex}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                      }
                      className="mt-1 accent-indigo-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {questionFeedback ? (
                <p
                  className={
                    "mt-4 rounded-xl p-3 text-sm leading-6 " +
                    (questionFeedback.correct
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800")
                  }
                >
                  {questionFeedback.correct ? "Correct. " : "Not quite. "}
                  {questionFeedback.explanation}
                </p>
              ) : null}
            </fieldset>
          );
        })}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => submitQuiz(artifact)}
            disabled={busy || questions.length === 0}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving attempt..." : "Submit answers"}
          </button>
          {score !== null ? (
            <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              Score: {score}%
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  function renderArtifact(artifact: ClientArtifact) {
    if (artifact.kind === "guide") {
      return renderGuide(artifact.payload as GuidePayload);
    }
    if (artifact.kind === "flashcards") {
      return renderFlashcards(artifact.payload as FlashcardsPayload);
    }
    if (artifact.kind === "practice_test") {
      return renderQuiz(artifact, artifact.payload as PracticeTestPayload);
    }
    return renderQuiz(artifact, artifact.payload as VideoQuizPayload);
  }

  const currentTool = toolOptions.find((option) => option.value === kind);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Study tools
        </p>
        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="study-space">
          Study space
        </label>
        <select
          id="study-space"
          value={selectedSpaceId}
          onChange={(event) => {
            setSelectedSpaceId(event.target.value);
            setArtifacts([]);
            setProgress([]);
            selectArtifact(null);
            setMessage(null);
          }}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
        >
          {studySpaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>

        <div className="mt-6 space-y-2">
          {toolOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setKind(option.value);
                selectArtifact(artifacts.find((artifact) => artifact.kind === option.value) ?? null);
              }}
              className={
                "w-full rounded-2xl border p-3 text-left transition " +
                (kind === option.value
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-transparent bg-slate-50 hover:border-slate-200")
              }
            >
              <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={() => loadArtifacts()}
            disabled={busy || !selectedSpaceId}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
          >
            Load saved tools
          </button>
          <button
            type="button"
            onClick={() => generateArtifact()}
            disabled={busy || !selectedSpaceId}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Working..." : "Generate selected tool"}
          </button>
        </div>
      </aside>

      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {currentTool?.label}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {activeArtifact?.title ?? "Build a study companion"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Generated only from your indexed materials, then saved privately to this study space.
            </p>
          </div>
          {activeArtifact ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Saved
            </span>
          ) : null}
        </div>

        {message ? (
          <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {message}
          </p>
        ) : null}

        {artifacts.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {artifacts
              .filter((artifact) => artifact.kind === kind)
              .map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={() => selectArtifact(artifact)}
                  className={
                    "rounded-full border px-3 py-2 text-xs font-semibold " +
                    (activeArtifact?.id === artifact.id
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-400")
                  }
                >
                  {new Date(artifact.created_at).toLocaleDateString()}
                </button>
              ))}
          </div>
        ) : null}

        {progress.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Recent progress
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {progress.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-indigo-900"
                >
                  {item.item_type.replace("_", " ")}: {item.last_score ?? 0}%
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          {activeArtifact ? (
            renderArtifact(activeArtifact)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-lg font-semibold text-slate-800">Nothing selected yet.</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Load a saved tool or generate a new one after indexing material in this study space.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
