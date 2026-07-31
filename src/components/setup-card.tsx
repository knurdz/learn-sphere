export function SetupCard() {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
        Local setup required
      </p>
      <h2 className="mt-3 text-2xl font-semibold">Connect Supabase to open the workspace</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-900/80">
        Copy <code className="font-semibold">.env.example</code> to{" "}
        <code className="font-semibold">.env.local</code>, add your Supabase
        project URL and anon key, then run the four migrations in order:
        <code className="ml-1 font-semibold">supabase/migrations/0001_phase1.sql</code> through
        <code className="ml-1 font-semibold">0004_study_tools.sql</code>.
      </p>
    </div>
  );
}
