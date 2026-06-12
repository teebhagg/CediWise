import type { ProfileSuggestionParsed } from "./aiResponseValidation.ts";

const EXPENSE_ALIASES: Record<string, string[]> = {
  rent: ["rent", "housing", "accommodation", "landlord"],
  groceries: ["groceries", "grocery", "food", "market", "provisions"],
  transport: ["transport", "trotro", "uber", "fuel", "petrol", "troski", "commute"],
  utilities: ["utilities", "ecg", "electricity", "water", "trash", "ghana water"],
  schoolfees: ["school fees", "school", "tuition", "education"],
  titheschurch: ["tithes", "church", "tithe", "offering"],
  databundles: ["data bundles", "data", "airtime", "internet", "wifi"],
  diningout: ["dining out", "dining", "restaurant", "eating out"],
  entertainment: ["entertainment", "movies", "cinema", "nightlife", "fun", "games", "hobbies"],
  subscriptions: ["subscriptions", "subscription", "netflix", "spotify", "streaming", "dstv", "apple music"],
  clothing: ["clothing", "clothes", "fashion", "apparel"],
  healthcare: ["healthcare", "health", "medical", "pharmacy", "hospital"],
  debtpayments: ["debt payments", "debt", "loan", "loans"],
  childcare: ["childcare", "child care", "nanny", "babysitter"],
  insurance: ["insurance", "premium"],
  savings: ["savings", "emergency", "vault"],
};

/** Fixed monthly bills belong in recurringExpenses, not duplicated as categories. */
const RECURRING_FIRST_KEYS = new Set([
  "rent",
  "utilities",
  "subscriptions",
  "schoolfees",
  "titheschurch",
  "debtpayments",
  "childcare",
  "insurance",
]);

function normalizeLabel(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function aliasKeysFor(label: string): string[] {
  const normalized = normalizeLabel(label);
  const keys: string[] = [normalized];
  for (const [key, aliases] of Object.entries(EXPENSE_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
      keys.push(key, ...aliases);
    }
  }
  return keys;
}

function canonicalExpenseKey(name: string): string {
  const normalized = normalizeLabel(name);
  for (const [key, aliases] of Object.entries(EXPENSE_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
      return key;
    }
  }
  return normalized;
}

export function suggestionNamesMatch(a: string, b: string): boolean {
  const keysA = new Set(aliasKeysFor(a));
  const keysB = new Set(aliasKeysFor(b));
  for (const key of keysA) {
    if (keysB.has(key)) return true;
    for (const other of keysB) {
      if (key.includes(other) || other.includes(key)) return true;
    }
  }
  return false;
}

type ConfidenceItem = { confidence?: number };

function pickPreferred<T extends ConfidenceItem>(
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

function dedupeCategories(
  categories: NonNullable<ProfileSuggestionParsed["categories"]>,
): NonNullable<ProfileSuggestionParsed["categories"]> {
  const byKey = new Map<string, (typeof categories)[number]>();
  for (const cat of categories) {
    const key = canonicalExpenseKey(cat.name);
    const existing = byKey.get(key);
    byKey.set(
      key,
      existing ? pickPreferred(existing, cat, (c) => c.suggestedLimit) : cat,
    );
  }
  return Array.from(byKey.values());
}

function dedupeRecurring(
  recurring: NonNullable<ProfileSuggestionParsed["recurringExpenses"]>,
): NonNullable<ProfileSuggestionParsed["recurringExpenses"]> {
  const byKey = new Map<string, (typeof recurring)[number]>();
  for (const rec of recurring) {
    const key = canonicalExpenseKey(rec.name);
    const existing = byKey.get(key);
    byKey.set(
      key,
      existing ? pickPreferred(existing, rec, (r) => r.amount) : rec,
    );
  }
  return Array.from(byKey.values());
}

function shouldPreferRecurring(name: string): boolean {
  return RECURRING_FIRST_KEYS.has(canonicalExpenseKey(name));
}

function shouldPreferCategory(name: string): boolean {
  const key = canonicalExpenseKey(name);
  return !RECURRING_FIRST_KEYS.has(key);
}

function crossDedupeLists(
  categories: NonNullable<ProfileSuggestionParsed["categories"]>,
  recurring: NonNullable<ProfileSuggestionParsed["recurringExpenses"]>,
): {
  categories: NonNullable<ProfileSuggestionParsed["categories"]>;
  recurring: NonNullable<ProfileSuggestionParsed["recurringExpenses"]>;
} {
  const dropCategoryIds = new Set<string>();
  const dropRecurringIds = new Set<string>();

  for (const cat of categories) {
    for (const rec of recurring) {
      if (!suggestionNamesMatch(cat.name, rec.name)) continue;

      if (shouldPreferRecurring(cat.name) || shouldPreferRecurring(rec.name)) {
        dropCategoryIds.add(cat.id);
      } else if (shouldPreferCategory(cat.name) && shouldPreferCategory(rec.name)) {
        dropRecurringIds.add(rec.id);
      } else {
        dropCategoryIds.add(cat.id);
      }
      break;
    }
  }

  return {
    categories: categories.filter((c) => !dropCategoryIds.has(c.id)),
    recurring: recurring.filter((r) => !dropRecurringIds.has(r.id)),
  };
}

/** Remove duplicate and overlapping AI suggestion lines. */
export function dedupeProfileSuggestion(
  raw: ProfileSuggestionParsed,
): ProfileSuggestionParsed {
  let categories = dedupeCategories(raw.categories ?? []);
  let recurringExpenses = dedupeRecurring(raw.recurringExpenses ?? []);
  const cross = crossDedupeLists(categories, recurringExpenses);
  categories = cross.categories;
  recurringExpenses = cross.recurring;

  return {
    ...raw,
    categories,
    recurringExpenses,
  };
}
