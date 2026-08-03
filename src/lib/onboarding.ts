import type { Material, StudySpace } from "@/lib/supabase/database";

export type OnboardingStep = 1 | 2 | 3;

export function getOnboardingStep(
  studySpaces: StudySpace[],
  materials: Material[],
): OnboardingStep {
  if (studySpaces.length === 0) return 1;
  if (materials.length === 0) return 2;
  return 3;
}
