import type { AISuggestionCategory } from "@/types/ai";

export const WANTS_OTHERS_CATEGORY_ID = "wants-others";
export const WANTS_OTHERS_CATEGORY_NAME = "Others";

export function isWantsOthersCategory(name: string, bucket?: string): boolean {
  return (
    bucket === "wants" &&
    name.trim().toLowerCase() === WANTS_OTHERS_CATEGORY_NAME.toLowerCase()
  );
}

export function createWantsOthersSuggestion(
  overrides: Partial<AISuggestionCategory> = {},
): AISuggestionCategory {
  return {
    id: WANTS_OTHERS_CATEGORY_ID,
    name: WANTS_OTHERS_CATEGORY_NAME,
    bucket: "wants",
    suggestedLimit: 0,
    reason: "Add spending here that does not fit your other wants categories.",
    confidence: 1,
    accepted: true,
    ...overrides,
  };
}

export function ensureWantsOthersCategory(
  categories: AISuggestionCategory[],
): AISuggestionCategory[] {
  const hasOthers = categories.some((c) => isWantsOthersCategory(c.name, c.bucket));
  if (hasOthers) {
    return categories.map((c) =>
      isWantsOthersCategory(c.name, c.bucket)
        ? { ...c, suggestedLimit: 0, bucket: "wants" as const }
        : c,
    );
  }
  return [...categories, createWantsOthersSuggestion()];
}
