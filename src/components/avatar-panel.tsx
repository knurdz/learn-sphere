"use client";

export function AvatarPanel() {
  const agentId = process.env.NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID;
  const isConfigured = Boolean(agentId && !agentId.startsWith("your-"));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            Live tutor
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Ask with your voice</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
          Avatar + voice
        </span>
      </div>
      {isConfigured ? (
        <iframe
          className="h-[420px] w-full border-0"
          src={"https://bey.chat/" + agentId}
          title="LearnSphere live tutor avatar"
          allow="camera; microphone; fullscreen"
          allowFullScreen
        />
      ) : (
        <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500 text-2xl font-bold text-white">
            L
          </div>
          <h3 className="mt-5 text-xl font-semibold text-white">
            Connect your Beyond Presence agent
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Add NEXT_PUBLIC_BEYOND_PRESENCE_AGENT_ID to .env.local. The agent
            should be configured in Beyond Presence Studio with the LearnSphere
            tutor instructions.
          </p>
        </div>
      )}
    </section>
  );
}
