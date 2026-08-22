import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { corsHeaderRecord } from "@/lib/cors";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const cors = corsHeaderRecord(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const response = NextResponse.next();
  for (const [name, value] of Object.entries(cors)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
