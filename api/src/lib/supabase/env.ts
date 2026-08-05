/** Runtime Supabase URL/key (Docker `api.env`). Not inlined at Next build time. */
export function resolveSupabaseUrl(): string | undefined {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim() || undefined;
}

export function resolveSupabaseAnonKey(): string | undefined {
  return (
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim() || undefined;
}

export function supabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}
