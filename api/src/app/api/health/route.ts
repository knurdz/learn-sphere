import { NextRequest, NextResponse } from "next/server";

import { resolvePublicOrigin } from "@/lib/request-origin";
import { resolveSupabaseAnonKey, resolveSupabaseUrl, supabaseProjectRef } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const url = resolveSupabaseUrl();
  const anonKey = resolveSupabaseAnonKey();
  const publicOrigin = resolvePublicOrigin(request, request.nextUrl.origin);

  return NextResponse.json({
    ok: true,
    service: "learnsphere-bridge",
    /** Asset URLs (meme templates) handed to the app must be https in production. */
    origin: {
      requestOrigin: request.nextUrl.origin,
      publicOrigin,
      sampleMemeUrl: `${publicOrigin}/meme-templates/drake.jpg`,
    },
    supabase: {
      configured: Boolean(url && anonKey),
      urlHost: url ? new URL(url).host : null,
      projectRef: supabaseProjectRef(url),
      /** First 12 chars of anon key — compare with Flutter/GitHub secrets (anon key is public). */
      anonKeyPreview: anonKey ? `${anonKey.slice(0, 12)}…` : null,
      envSources: {
        supabaseUrl: process.env.SUPABASE_URL ? "SUPABASE_URL" : process.env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        anonKey: process.env.SUPABASE_ANON_KEY ? "SUPABASE_ANON_KEY" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      },
    },
    livekit: {
      configured: Boolean(
        process.env.LIVEKIT_URL?.trim() &&
          process.env.LIVEKIT_API_KEY?.trim() &&
          process.env.LIVEKIT_API_SECRET?.trim(),
      ),
    },
  });
}
