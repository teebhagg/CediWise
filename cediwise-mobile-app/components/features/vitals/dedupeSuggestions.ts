import type { AIProfileSuggestions, AISuggestionCategory } from "@/types/ai";
import { expenseLabelsMatch, normalizeExpenseLabel } from "./expenseMatchingCore";
import {
  ensureWantsOthersCategory,
  isWantsOthersCategory,
} from "./wantsOthersCategory";

const TRANSPORT_PATTERN =
  /\b(transport|trotro|uber|fuel|petrol|troski|commute|taxi|bolt)\b/i;

function isTransportName(name: string): boolean {
  return (
    TRANSPORT_PATTERN.test(name) || expenseLabelsMatch(name, "Transport")
  );
}

function coerceTransportToNeeds<T extends { name: string; bucket: string }>(
  items: T[],
): T[] {
  return items.map((item) =>
    isTransportName(item.name) ? { ...item, bucket: "needs" } : item,
  );
}

const RECURRING_FIRST_LABELS = [
  "rent",
  "utilities",
  "subscriptions",
  "school fees",
  "tithes",
  "debt",
  "childcare",
  "insurance",
];

function isRecurringFirst(name: string): boolean {
  return RECURRING_FIRST_LABELS.some((label) => expenseLabelsMatch(name, label));
}

function namesOverlap(a: string, b: string): boolean {
  return (
    expenseLabelsMatch(a, b) ||
    normalizeExpenseLabel(a) === normalizeExpenseLabel(b)
  );
}

function pickPreferred<T extends { confidence?: number }>(
  current: T,
  candidate: T,
  amountOf: (item: T) => number,
): T {
  const currentConfidence = current.confidence ?? 0;
  const candidateConfidence = candidate.confidence ?? 0;
  if (candidateConfidence !== currentConfidence) {
    return candidateConfidence > currentConfidence ? candidate : current;
  }
  return amountOf(candidate) >= amountOf(current) ? candidate : current;
}

function dedupeByName<T extends { id: string; name: string; confidence?: number }>(
  items: T[],
  amountOf: (item: T) => number,
): T[] {
  const result: T[] = [];
  for (const item of items) {
    const matchIndex = result.findIndex((existing) =>
      namesOverlap(existing.name, item.name),
    );
    if (matchIndex === -1) {
      result.push(item);
      continue;
    }
    result[matchIndex] = pickPreferred(result[matchIndex], item, amountOf);
  }
  return result;
}

/**
 * Optional client-side dedupe for tests/offline paths.
 * Production fetches use server-side normalizeProfileSuggestion instead.
 */
export function dedupeAIProfileSuggestions(
  suggestions: AIProfileSuggestions,
): AIProfileSuggestions {
  let categories = coerceTransportToNeeds(
    dedupeByName(suggestions.categories, (c) => c.suggestedLimit),
  );
  let recurringExpenses = coerceTransportToNeeds(
    dedupeByName(suggestions.recurringExpenses, (r) => r.amount),
  );

  const dropCategoryIds = new Set<string>();
  const dropRecurringIds = new Set<string>();

  for (const cat of categories) {
    for (const rec of recurringExpenses) {
      if (!namesOverlap(cat.name, rec.name)) continue;

      if (isRecurringFirst(cat.name) || isRecurringFirst(rec.name)) {
        dropCategoryIds.add(cat.id);
      } else {
        dropRecurringIds.add(rec.id);
      }
      break;
    }
  }

  categories = categories.filter((c) => !dropCategoryIds.has(c.id));
  recurringExpenses = recurringExpenses.filter((r) => !dropRecurringIds.has(r.id));
  categories = ensureWantsOthersCategory(categories as AISuggestionCategory[]);

  return {
    ...suggestions,
    categories,
    recurringExpenses,
  };
}

export { isWantsOthersCategory };
