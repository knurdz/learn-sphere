import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTeachingInstructions } from "./live-tutor";
import type { Database } from "@/lib/supabase/database";

describe("live tutor briefing", () => {
  it("omits JSON generation directives from spoken instructions", async () => {
    const supabase = {
      from: (table: string) => {
        if (table !== "materials") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: async () => ({ data: [] }),
              }),
            }),
          }),
        };
      },
    } as unknown as SupabaseClient<Database>;

    const instructions = await buildTeachingInstructions(
      supabase,
      "user-id",
      "00000000-0000-4000-8000-000000000001",
      "tutor",
      "",
      "",
      "en",
    );

    expect(instructions).not.toContain("JSON object keys");
    expect(instructions).toContain("Reply in English");
  });
});
