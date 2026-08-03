import { describe, expect, it } from "vitest";
import { getOnboardingStep } from "./onboarding";

const studySpace = {
  id: "space-1",
  user_id: "user-1",
  name: "Biology",
  description: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const material = {
  id: "material-1",
  user_id: "user-1",
  study_space_id: "space-1",
  name: "Cells.pdf",
  mime_type: "application/pdf",
  size_bytes: 100,
  storage_path: "user-1/material-1/Cells.pdf",
  status: "uploaded" as const,
  ingestion_error: null,
  ingested_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("onboarding progress", () => {
  it("starts with subject setup for a new account", () => {
    expect(getOnboardingStep([], [])).toBe(1);
  });

  it("resumes at material setup when a subject exists", () => {
    expect(getOnboardingStep([studySpace], [])).toBe(2);
  });

  it("resumes at preparation when material already exists", () => {
    expect(getOnboardingStep([studySpace], [material])).toBe(3);
  });
});
