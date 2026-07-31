"use client";

import { FormEvent, useRef, useState } from "react";
import type { ChatMessage, StudySpace } from "@/lib/supabase/database";

function CitationList({ message }: { message: ChatMessage }) {
  if (!message.citations || message.citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Sources
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {message.citations.map((citation) => (
          <span
            className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700"
            key={citation.chunkId}
            title={citation.quote}
          >
            {citation.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TutorWorkspace({ studySpaces }: { studySpaces: StudySpace[] }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(studySpaces[0]?.id || "");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function ensureSession() {
    if (sessionId) {
      return sessionId;
    }

    const response = await fetch("/api/tutor/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studySpaceId: selectedSpaceId }),
    });
    const result = (await response.json()) as {
      error?: string;
      session?: { id: string };
    };

    if (!response.ok || !result.session) {
      throw new Error(result.error || "Could not start a tutor session.");
    }

    setSessionId(result.session.id);
    return result.session.id;
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = question.trim();
    if (!content || isBusy) {
      return;
    }

    setError("");
    setStatus("");
    setIsBusy(true);

    try {
      const currentSessionId = await ensureSession();
      const response = await fetch(
        "/api/tutor/sessions/" + currentSessionId + "/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
      };

      if (!response.ok || !result.userMessage || !result.assistantMessage) {
        throw new Error(result.error || "The tutor could not answer.");
      }

      setMessages((current) => [
        ...current,
        result.userMessage as ChatMessage,
        result.assistantMessage as ChatMessage,
      ]);
      setQuestion("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The tutor could not answer.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support microphone recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await submitVoice(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setError("");
      setStatus("Recording… click again to send.");
      setIsRecording(true);
    } catch {
      setError("Microphone permission was not granted.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    setStatus("Transcribing your question…");
  }

  async function submitVoice(blob: Blob) {
    setIsBusy(true);
    setError("");

    try {
      const currentSessionId = await ensureSession();
      const formData = new FormData();
      formData.append("audio", blob, "voice-question.webm");
      const response = await fetch(
        "/api/tutor/sessions/" + currentSessionId + "/voice",
        { method: "POST", body: formData },
      );
      const result = (await response.json()) as {
        error?: string;
        transcript?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
      };

      if (!response.ok || !result.userMessage || !result.assistantMessage) {
        throw new Error(result.error || "The voice question failed.");
      }

      setMessages((current) => [
        ...current,
        result.userMessage as ChatMessage,
        result.assistantMessage as ChatMessage,
      ]);
      setStatus(result.transcript ? "Voice question answered." : "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The voice question failed.",
      );
      setStatus("");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="flex min-h-[680px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <label className="block text-sm font-medium text-slate-700">
            Study space
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              value={selectedSpaceId}
              onChange={(event) => {
                setSelectedSpaceId(event.target.value);
                setSessionId("");
                setMessages([]);
                setError("");
                setStatus("");
              }}
              disabled={isBusy}
            >
              {studySpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600">
                ?
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">
                Ask about your indexed material
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                The tutor only answers from the selected study space and
                includes source citations with every supported answer.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={
                  message.role === "user"
                    ? "ml-8 rounded-2xl bg-slate-950 p-4 text-white"
                    : "mr-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800"
                }
                key={message.id}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">
                  {message.role === "user" ? "You" : "LearnSphere tutor"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                {message.role === "assistant" && <CitationList message={message} />}
              </article>
            ))
          )}
        </div>

        <div className="border-t border-slate-200 p-5">
          {error && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          {status && <p className="mb-3 text-xs text-indigo-600">{status}</p>}
          <form className="flex gap-3" onSubmit={submitQuestion}>
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about your material..."
              aria-label="Tutor question"
              disabled={isBusy}
            />
            <button
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isBusy || !selectedSpaceId || !question.trim()}
            >
              {isBusy ? "..." : "Ask"}
            </button>
          </form>
          <button
            className={
              isRecording
                ? "mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                : "mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
            }
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isBusy}
          >
            {isRecording ? "Stop and send voice question" : "Ask with microphone"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Grounded answers
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Learn from what you uploaded.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Every answer is retrieved from your selected study space. Page and
            timestamp references make it easy to verify the explanation.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
            Avatar setup
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The live avatar is embedded from Beyond Presence so voice and video
            stay in the learning experience without exposing provider keys.
          </p>
        </div>
      </div>
    </section>
  );
}
