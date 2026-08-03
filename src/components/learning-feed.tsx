"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import type { LearningFeedKind, StudySpace } from "@/lib/supabase/database";

type FeedProgress = {
  completedAt: string | null;
  lastScore: number | null;
};

type FeedItem = {
  id: string;
  kind: LearningFeedKind;
  title: string;
  payload: Record<string, unknown>;
  assetUrl: string | null;
  studySpaceId: string;
  studySpaceName: string;
  materialName: string | null;
  createdAt: string;
  progress: FeedProgress;
};

type AttemptResult = {
  correct: boolean;
  score: number;
  explanation: string;
  answer?: string;
};

const categories: Array<{ value: "all" | LearningFeedKind; label: string }> = [
  { value: "all", label: "For you" },
  { value: "meme", label: "Memes" },
  { value: "flashcard", label: "Cards" },
  { value: "quiz", label: "Quizzes" },
  { value: "fill_blank", label: "Fill-in" },
  { value: "true_false", label: "True / False" },
  { value: "did_you_know", label: "Facts" },
];

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function errorValue(body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return "Could not load the learning feed.";
}

function tutorPrompt(item: FeedItem) {
  const payload = item.payload;
  if (item.kind === "flashcard") return `Explain this flashcard: ${textValue(payload.front)}`;
  if (item.kind === "quiz") return `Explain the concept behind this question: ${textValue(payload.question)}`;
  if (item.kind === "fill_blank") return `Help me understand this concept: ${textValue(payload.prompt)}`;
  if (item.kind === "true_false") return `Explain whether this statement is true or false: ${textValue(payload.statement)}`;
  if (item.kind === "did_you_know") return `Tell me more about this fact: ${textValue(payload.fact)}`;
  return `Help me understand the idea behind this learning meme: ${item.title}`;
}

function tutorHref(item: FeedItem) {
  const params = new URLSearchParams({
    studySpaceId: item.studySpaceId,
    prompt: tutorPrompt(item),
    returnTo: "/feed",
  });
  return `/tutor?${params.toString()}`;
}

function AttemptPanel({
  item,
  onResult,
}: {
  item: FeedItem;
  onResult: (result: AttemptResult) => void;
}) {
  const [answer, setAnswer] = useState<string | boolean | number>(
    item.kind === "true_false" ? false : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(nextAnswer: string | boolean | number = answer) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/learning/${item.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: nextAnswer }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorValue(body));
      onResult(body as AttemptResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save your answer.");
    } finally {
      setBusy(false);
    }
  }

  if (item.kind === "fill_blank") {
    return (
      <div className="mt-6 space-y-3">
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/20"
          placeholder="Type your answer"
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={busy}
        />
        <button
          className="rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          type="button"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? "Checking..." : "Check answer"}
        </button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    );
  }

  if (item.kind === "true_false") {
    return (
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            [true, "True"],
            [false, "False"],
          ].map(([value, label]) => (
            <button
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50"
              type="button"
              key={label as string}
              onClick={() => {
                setAnswer(value as boolean);
                void submit(value as boolean);
              }}
              disabled={busy}
            >
              {label as string}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    );
  }

  const options = Array.isArray(item.payload.options)
    ? item.payload.options.map(textValue)
    : [];

  return (
    <div className="mt-6 space-y-2">
      {options.map((option, index) => (
        <button
          key={option + index}
          className="block w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50"
          type="button"
          onClick={() => {
            setAnswer(index);
            void submit(index);
          }}
          disabled={busy}
        >
          <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-indigo-200">
            {String.fromCharCode(65 + index)}
          </span>
          {option}
        </button>
      ))}
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}

function FeedSlide({
  item,
  index,
  onCompleted,
}: {
  item: FeedItem;
  index: number;
  onCompleted: (itemId: string, progress: FeedProgress) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  const payload = item.payload;
  const isCompleted = Boolean(item.progress.completedAt);
  const canMarkLearned = item.kind === "meme" || item.kind === "flashcard" || item.kind === "did_you_know";

  async function markLearned() {
    if (marking || isCompleted) return;
    setMarking(true);
    setError("");
    try {
      const response = await fetch(`/api/learning/${item.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(errorValue(body));
      onCompleted(item.id, body.progress as FeedProgress);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save progress.");
    } finally {
      setMarking(false);
    }
  }

  function handleAttempt(resultValue: AttemptResult) {
    setResult(resultValue);
    onCompleted(item.id, {
      completedAt: new Date().toISOString(),
      lastScore: resultValue.score,
    });
  }

  function nextCard() {
    document.getElementById(`feed-item-${index + 1}`)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <article className="mx-auto flex min-h-full w-full max-w-5xl items-center px-4 py-8 sm:px-8 lg:px-14">
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.24),_transparent_38%),linear-gradient(145deg,#151a2b,#0d101c)] p-5 shadow-2xl shadow-indigo-950/30 sm:p-8 lg:p-10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.16em]">
          <span className="text-indigo-300">{item.kind.replaceAll("_", " ")}</span>
          <span className="truncate text-right text-slate-500">{item.studySpaceName}</span>
        </div>

        {item.kind === "meme" && item.assetUrl ? (
          <div className="relative mt-6 flex max-h-[52vh] justify-center overflow-hidden rounded-3xl bg-black/40 p-3">
            <Image className="max-h-[52vh] w-auto max-w-full rounded-2xl object-contain" src={item.assetUrl} alt="Educational meme" width={900} height={900} unoptimized />
          </div>
        ) : item.kind === "flashcard" ? (
          <button
            className={`relative mt-6 flex min-h-72 w-full flex-col justify-between rounded-3xl p-7 text-left transition sm:min-h-80 sm:p-10 ${flipped ? "bg-emerald-400/15" : "bg-indigo-400/15"}`}
            type="button"
            onClick={() => setFlipped((value) => !value)}
            aria-label={flipped ? "Show flashcard question" : "Reveal flashcard answer"}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {flipped ? "Answer · tap to flip back" : "Recall · tap to reveal"}
            </p>
            <p className="text-2xl font-semibold leading-tight text-white sm:text-4xl">
              {flipped ? textValue(payload.back) : textValue(payload.front)}
            </p>
            <p className="text-sm text-slate-400">Tap anywhere to flip</p>
          </button>
        ) : (
          <div className="relative mt-6 rounded-3xl bg-white/[0.06] p-6 sm:p-8">
            <p className="text-2xl font-semibold leading-tight text-white sm:text-4xl">
              {textValue(payload.question) || textValue(payload.prompt) || textValue(payload.statement) || textValue(payload.fact)}
            </p>
            {item.kind === "did_you_know" && <p className="mt-5 text-sm leading-7 text-slate-300">{textValue(payload.concept)}</p>}
            {!result && (item.kind === "quiz" || item.kind === "fill_blank" || item.kind === "true_false") && (
              <AttemptPanel item={item} onResult={handleAttempt} />
            )}
            {result && (
              <div className={`mt-6 rounded-2xl border p-4 ${result.correct ? "border-emerald-300/30 bg-emerald-300/10" : "border-amber-300/30 bg-amber-300/10"}`}>
                <p className="font-semibold text-white">{result.correct ? "Correct" : "Keep going"}</p>
                {result.answer && <p className="mt-1 text-sm text-slate-200">Answer: {result.answer}</p>}
                <p className="mt-1 text-sm leading-6 text-slate-300">{result.explanation}</p>
              </div>
            )}
          </div>
        )}

        <div className="relative mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">{item.title}</h2>
              {isCompleted && <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">Learned</span>}
            </div>
            <p className="mt-2 text-sm text-slate-400">{item.materialName ?? "Generated from your learning space"}</p>
            {item.progress.lastScore !== null && <p className="mt-1 text-xs font-semibold text-indigo-300">Last score · {item.progress.lastScore}%</p>}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {canMarkLearned && !isCompleted && (
              <button className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-300/50 hover:text-emerald-200 disabled:opacity-50" type="button" onClick={() => void markLearned()} disabled={marking}>
                {marking ? "Saving..." : "Mark learned"}
              </button>
            )}
            <Link className="rounded-xl bg-indigo-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400" href={tutorHref(item)}>
              Ask tutor
            </Link>
            {result && <button className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:text-white" type="button" onClick={nextCard}>Next card</button>}
          </div>
        </div>
        {error && <p className="relative mt-4 text-sm text-rose-300" role="alert">{error}</p>}
        <p className="relative mt-6 text-xs font-medium text-slate-500">Scroll for your next card · {index + 1}</p>
      </div>
    </article>
  );
}

export function LearningFeed({
  studySpaces,
  initialSpaceId = "",
  email,
}: {
  studySpaces: StudySpace[];
  initialSpaceId?: string;
  email?: string;
}) {
  const [studySpaceId, setStudySpaceId] = useState(initialSpaceId);
  const [kind, setKind] = useState<"all" | LearningFeedKind>("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const selectedSpaceName = useMemo(
    () => studySpaces.find((space) => space.id === studySpaceId)?.name,
    [studySpaces, studySpaceId],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    const query = new URLSearchParams({ limit: "80" });
    if (studySpaceId) query.set("studySpaceId", studySpaceId);
    if (kind !== "all") query.set("kind", kind);

    try {
      const response = await fetch("/api/feed?" + query.toString());
      const body = await response.json();
      if (!response.ok) throw new Error(errorValue(body));
      setItems((body.items ?? []) as FeedItem[]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load the feed.");
    } finally {
      setBusy(false);
    }
  }, [kind, studySpaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateProgress(itemId: string, progress: FeedProgress) {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, progress } : item)));
  }

  return (
    <AppShell immersive email={email}>
      <main className="min-h-[100dvh] bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-20 sm:px-8 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Your learning feed</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Keep your streak of understanding.</h1>
            </div>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-400 sm:inline-flex">
              {selectedSpaceName ?? "All subjects"}
            </span>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Feed category filters">
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setKind(category.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${kind === category.value ? "bg-white text-slate-950" : "border border-white/10 bg-white/[0.05] text-slate-400 hover:border-white/20 hover:text-white"}`}
              >
                {category.label}
              </button>
            ))}
            <select
              className="ml-auto min-w-36 shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 outline-none focus:border-indigo-300"
              value={studySpaceId}
              onChange={(event) => setStudySpaceId(event.target.value)}
              aria-label="Filter by study space"
            >
              <option className="bg-slate-900" value="">All subjects</option>
              {studySpaces.map((space) => <option className="bg-slate-900" key={space.id} value={space.id}>{space.name}</option>)}
            </select>
          </div>
        </div>

        {busy ? (
          <div className="grid min-h-[55vh] place-items-center px-6 text-sm text-slate-400">Loading your next lesson...</div>
        ) : error ? (
          <div className="mx-auto max-w-xl px-6 py-20 text-center">
            <p className="text-lg font-semibold text-rose-300">{error}</p>
            <button className="mt-5 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => void load()}>Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-xl px-6 py-20 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">Nothing in this filter yet</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Try another subject or add material.</h2>
            <Link className="mt-6 inline-flex rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white" href="/dashboard#add-material">Add material</Link>
          </div>
        ) : (
          <div className="mx-auto h-[calc(100dvh-190px)] max-w-7xl overflow-y-auto snap-y snap-mandatory overscroll-y-contain scroll-smooth">
            {items.map((item, index) => (
              <section className="min-h-full snap-start" id={`feed-item-${index}`} key={item.id}>
                <FeedSlide item={item} index={index} onCompleted={updateProgress} />
              </section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
