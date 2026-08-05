import { resolveSupabaseAnonKey, resolveSupabaseUrl } from "./env";

export function hasSupabaseEnv() {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}

export function getSupabaseEnv() {
  const url = resolveSupabaseUrl();
  const anonKey = resolveSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_* for local dev) in api.env / .env.local.",
    );
  }

  return { url: url.replace(/\/+$/, ""), anonKey };
}
