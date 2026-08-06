import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getAuthContext: vi.fn(),
}));

import { GET } from "./route";
import { getAuthContext } from "@/lib/supabase/server";

const userId = "22222222-2222-4222-8222-222222222222";
const studySpaceId = "33333333-3333-4333-8333-333333333333";
const sessionId = "44444444-4444-4444-8444-444444444444";

function chain(
  result: { data: unknown; error: unknown },
  terminal: "maybeSingle" | "limit" = "maybeSingle",
) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder[terminal] = vi.fn(async () => result);
  if (terminal !== "limit") {
    builder.maybeSingle = vi.fn(async () => result);
  }
  builder.then = vi.fn((onFulfilled: (value: typeof result) => unknown) =>
    Promise.resolve(result).then(onFulfilled),
  ) as never;
  return builder;
}

function createSupabase(options?: {
  studySpaceExists?: boolean;
  sessions?: unknown[];
  messages?: unknown[];
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "study_spaces") {
        return chain({
          data: options?.studySpaceExists === false ? null : { id: studySpaceId },
          error: null,
        });
      }
      if (table === "chat_sessions") {
        return chain(
          {
            data: options?.sessions ?? [
              {
                id: sessionId,
                title: "New tutor session",
                updated_at: "2026-08-06T10:00:00.000Z",
                created_at: "2026-08-06T09:00:00.000Z",
              },
            ],
            error: null,
          },
          "limit",
        );
      }
      if (table === "chat_messages") {
        return chain(
          {
            data: options?.messages ?? [
              {
                session_id: sessionId,
                role: "assistant",
                content: "Here is a concise answer from your material.",
                created_at: "2026-08-06T10:00:00.000Z",
              },
              {
                session_id: sessionId,
                role: "user",
                content: "What is photosynthesis?",
                created_at: "2026-08-06T09:59:00.000Z",
              },
            ],
            error: null,
          },
          "limit",
        );
      }
      return chain({ data: null, error: null });
    }),
  };
}

describe("GET /api/tutor/sessions/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session summaries scoped to study space", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase() as never,
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/tutor/sessions/list?studySpaceId=${studySpaceId}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      sessions: Array<{ id: string; messageCount: number; preview: string }>;
    };
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0]?.id).toBe(sessionId);
    expect(body.sessions[0]?.messageCount).toBe(2);
    expect(body.sessions[0]?.preview).toContain("Tutor:");
  });

  it("returns 400 for invalid studySpaceId", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase() as never,
    } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/tutor/sessions/list?studySpaceId=bad"),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when study space does not belong to user", async () => {
    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: createSupabase({ studySpaceExists: false }) as never,
    } as never);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/tutor/sessions/list?studySpaceId=${studySpaceId}`,
      ),
    );
    expect(response.status).toBe(404);
  });
});
