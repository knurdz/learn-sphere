import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, hasSupabaseEnv } from "./config";
import type { Database } from "./database";

export function getBearerToken(request?: Request) {
  return request?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export async function createSupabaseServerClient(
  request?: Request,
): Promise<
  SupabaseClient<Database>
> {
  const { url, anonKey } = getSupabaseEnv();
  const bearer = getBearerToken(request);

  // Native clients authenticate with their Supabase access token instead of
  // the browser cookie maintained by the Next.js middleware.
  if (bearer) {
    return createClient<Database>(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes them.
        }
      },
    },
  });
}

export async function getAuthContext(request?: Request) {
  if (!hasSupabaseEnv()) {
    return {
      configured: false as const,
      user: null,
      supabase: null,
    };
  }

  const supabase = await createSupabaseServerClient(request);
  const bearer = getBearerToken(request);
  const result = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  return {
    configured: true as const,
    user: result.data.user,
    supabase,
    authError: result.error?.message ?? null,
  };
}
