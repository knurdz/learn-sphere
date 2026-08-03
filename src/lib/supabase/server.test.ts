import { describe, expect, it } from "vitest";

import { getBearerToken } from "./server";

describe("native API authentication", () => {
  it("extracts a bearer token case-insensitively", () => {
    const request = new Request("https://example.test/api/feed", {
      headers: { Authorization: "bearer mobile-access-token" },
    });

    expect(getBearerToken(request)).toBe("mobile-access-token");
  });

  it("does not treat cookie or malformed auth as a bearer token", () => {
    expect(getBearerToken(new Request("https://example.test"))).toBeNull();
    expect(
      getBearerToken(new Request("https://example.test", { headers: { Authorization: "Basic abc" } })),
    ).toBeNull();
  });
});
