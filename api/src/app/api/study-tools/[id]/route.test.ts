import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const artifactId = "55555555-5555-4555-8555-555555555555";
const userId = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/supabase/server", () => ({
  getAuthContext: vi.fn(),
}));

import { DELETE } from "./route";
import { getAuthContext } from "@/lib/supabase/server";

function chain(result: unknown = { data: null, error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => builder;
  for (const method of ["select", "eq", "delete", "in", "update"]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn(async () => result);
  // Awaited delete chains resolve to the result object.
  builder.then = undefined;
  Object.assign(builder, {
    then: undefined,
  });
  // Make the builder thenable so `await supabase.from().delete().eq().eq()` works.
  (builder as { then?: typeof Promise.prototype.then }).then = (
    onFulfilled: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

describe("DELETE /api/study-tools/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a video quiz owned by the user", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "study_artifacts") {
          const selectBuilder = chain({
            data: { id: artifactId, kind: "video_quiz", asset_path: null },
            error: null,
          });
          const deleteBuilder = chain({ error: null });
          selectBuilder.select = vi.fn(() => selectBuilder);
          selectBuilder.delete = vi.fn(() => deleteBuilder);
          return selectBuilder;
        }
        return chain({ error: null });
      }),
      storage: {
        from: vi.fn(() => ({ remove: vi.fn(async () => ({ error: null })) })),
      },
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await DELETE(
      new NextRequest(`http://localhost/api/study-tools/${artifactId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artifactId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledWith("study_artifacts");
    expect(supabase.from).toHaveBeenCalledWith("learning_progress");
    expect(supabase.from).toHaveBeenCalledWith("study_attempts");
  });

  it("returns 404 when the study tool is missing", async () => {
    const supabase = {
      from: vi.fn(() => chain({ data: null, error: null })),
      storage: { from: vi.fn() },
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await DELETE(
      new NextRequest(`http://localhost/api/study-tools/${artifactId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artifactId }) },
    );

    expect(response.status).toBe(404);
  });

  it("rejects deleting feed artifacts through this path", async () => {
    const supabase = {
      from: vi.fn(() =>
        chain({
          data: { id: artifactId, kind: "quiz", asset_path: null },
          error: null,
        }),
      ),
      storage: { from: vi.fn() },
    };

    vi.mocked(getAuthContext).mockResolvedValue({
      configured: true,
      user: { id: userId, email: "learner@test" },
      supabase: supabase as never,
    } as never);

    const response = await DELETE(
      new NextRequest(`http://localhost/api/study-tools/${artifactId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: artifactId }) },
    );

    expect(response.status).toBe(400);
  });
});
