import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateMaterialFile } from "./validation";

describe("validateMaterialFile", () => {
  it("accepts a PDF within the Phase 1 size limit", () => {
    expect(
      validateMaterialFile({
        name: "calculus-notes.pdf",
        type: "application/pdf",
        size: 2 * 1024 * 1024,
      }),
    ).toEqual({ valid: true, mimeType: "application/pdf" });
  });

  it("infers supported types when the browser omits the MIME type", () => {
    expect(
      validateMaterialFile({
        name: "lecture.docx",
        type: "",
        size: 1024,
      }),
    ).toEqual({
      valid: true,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("rejects unsupported files", () => {
    expect(
      validateMaterialFile({
        name: "notes.exe",
        type: "application/octet-stream",
        size: 1024,
      }).valid,
    ).toBe(false);
  });

  it("rejects files above the Free-plan-friendly limit", () => {
    const result = validateMaterialFile({
      name: "large-video.mp4",
      type: "video/mp4",
      size: MAX_UPLOAD_BYTES + 1,
    });

    expect(result).toEqual({
      valid: false,
      error: "Too big: expected number to be <=26214400",
    });
  });
});
