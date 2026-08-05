import { NextResponse } from "next/server";

import { supabaseProjectRef } from "@/lib/supabase/env";
import { getAuthContext, getBearerToken } from "@/lib/supabase/server";

/** Validates a mobile Bearer token against the server Supabase project. */
export async function GET(request: Request) {
  const context = await getAuthContext(request);
  const bearer = getBearerToken(request);
  const projectRef = supabaseProjectRef(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  if (!context.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase is not configured on the bridge.",
        hint: "On the VM, set SUPABASE_URL and SUPABASE_ANON_KEY in /opt/learnsphere/env/api.env, then restart the api container.",
      },
      { status: 503 },
    );
  }

  if (!bearer) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Authorization: Bearer <access_token>.",
        supabaseProjectRef: projectRef,
        hint: "Sign in on the app, then copy the access token from Supabase session or use curl after login.",
      },
      { status: 401 },
    );
  }

  if (!context.user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Token rejected by Supabase.",
        supabaseProjectRef: projectRef,
        authError: context.authError,
        hint:
          "The APK SUPABASE_URL / SUPABASE_ANON_KEY must be the same project as the server api.env. Sign out, clear app data, sign in again.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    supabaseProjectRef: projectRef,
    user: {
      id: context.user.id,
      email: context.user.email,
    },
  });
}
