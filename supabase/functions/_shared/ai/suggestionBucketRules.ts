import type { ProfileSuggestionParsed } from "./aiResponseValidation.ts";

const TRANSPORT_PATTERN =
  /\b(transport|trotro|uber|fuel|petrol|troski|commute|taxi|bolt)\b/i;

export const WANTS_OTHERS_CATEGORY_ID = "wants-others";
export const WANTS_OTHERS_CATEGORY_NAME = "Others";

export function isTransportName(name: string): boolean {
  return TRANSPORT_PATTERN.test(name);
}

export function coerceTransportToNeeds(
  raw: ProfileSuggestionParsed,
): ProfileSuggestionParsed {
  const categories = (raw.categories ?? []).map((c) =>
    isTransportName(c.name) ? { ...c, bucket: "needs" as const } : c,
  );
  const recurringExpenses = (raw.recurringExpenses ?? []).map((r) =>
    isTransportName(r.name) ? { ...r, bucket: "needs" as const } : r,
  );
  return { ...raw, categories, recurringExpenses };
}

function isWantsOthers(name: string, bucket: string): boolean {
  return (
    bucket === "wants" &&
    name.trim().toLowerCase() === WANTS_OTHERS_CATEGORY_NAME.toLowerCase()
  );
}

export function ensureWantsOthersCategory(
  raw: ProfileSuggestionParsed,
): ProfileSuggestionParsed {
  const categories = [...(raw.categories ?? [])];
  const existingIndex = categories.findIndex((c) =>
    isWantsOthers(c.name, c.bucket),
  );

  if (existingIndex >= 0) {
    categories[existingIndex] = {
      ...categories[existingIndex],
      bucket: "wants",
      suggestedLimit: 0,
    };
    return { ...raw, categories };
  }

  categories.push({
    id: WANTS_OTHERS_CATEGORY_ID,
    name: WANTS_OTHERS_CATEGORY_NAME,
    bucket: "wants",
    suggestedLimit: 0,
    reason: "Catch-all for spending that does not fit other wants categories.",
    confidence: 1,
  });

  return { ...raw, categories };
}

export function applySuggestionBucketRules(
  raw: ProfileSuggestionParsed,
): ProfileSuggestionParsed {
  return ensureWantsOthersCategory(coerceTransportToNeeds(raw));
}
