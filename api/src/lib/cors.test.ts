import { isAllowedCorsOrigin } from "./cors";

describe("isAllowedCorsOrigin", () => {
  it("allows Flutter web on localhost with any port", () => {
    expect(isAllowedCorsOrigin("http://localhost:8080")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:54131")).toBe(true);
  });

  it("allows the production site", () => {
    expect(isAllowedCorsOrigin("https://learnsphere.knurdz.org")).toBe(true);
  });

  it("rejects unknown origins", () => {
    expect(isAllowedCorsOrigin("https://evil.example")).toBe(false);
    expect(isAllowedCorsOrigin(null)).toBe(false);
  });
});
