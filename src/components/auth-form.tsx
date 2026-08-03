"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const result = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName },
              emailRedirectTo:
                window.location.origin + "/auth/callback?next=/feed",
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (isSignup && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        router.push("/feed");
        router.refresh();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
      <div className="mb-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
          LearnSphere
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {isSignup ? "Create your learning space" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isSignup
            ? "Start with your own private workspace for course materials."
            : "Sign in to continue studying from your saved materials."}
        </p>
      </div>

      {!hasSupabaseEnv() && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Supabase is not configured yet. Add the values from{" "}
          <code className="font-semibold">.env.local</code> before submitting
          this form.
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        {isSignup && (
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            type="password"
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
          />
        </label>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}

        <button
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || !hasSupabaseEnv()}
          type="submit"
        >
          {isSubmitting ? "Working..." : isSignup ? "Create student account" : "Sign in"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        {isSignup ? "Already have an account?" : "New to LearnSphere?"}{" "}
        <Link
          className="font-semibold text-indigo-600 hover:text-indigo-800"
          href={isSignup ? "/auth/login" : "/auth/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
