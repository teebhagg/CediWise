/**
 * On-device MoMo category preview — mirrors server `sms-import/categoryRules.ts`
 * so the review list shows the category that will be saved.
 */

export type SmsCategoryCandidate = {
  id: string;
  name: string;
  bucket: string;
};

export const SMS_CATEGORY_FALLBACK_NAMES = [
  "others",
  "transport",
  "groceries",
] as const;

type CategoryRule = {
  prefer: string[];
  signals: string[];
};

export const SMS_CATEGORY_RULES: CategoryRule[] = [
  {
    prefer: ["data bundles", "others"],
    signals: ["airtime", "mtn airtime", "data bundle", "data bundles", "internet"],
  },
  {
    prefer: ["data bundles", "others"],
    signals: ["bundle"],
  },
  {
    prefer: ["ecg"],
    signals: ["ecg"],
  },
  {
    prefer: ["ghana water"],
    signals: ["ghana water", "gwcl"],
  },
];

function findByName(
  categories: SmsCategoryCandidate[],
  name: string,
): SmsCategoryCandidate | null {
  const needle = name.trim().toLowerCase();
  return categories.find((row) => row.name?.trim().toLowerCase() === needle) ?? null;
}

export function formatSmsCategoryLabel(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Pick a budget category from MoMo parse context using the same rules as the server.
 */
export function pickCategoryForSmsPreview(
  categories: SmsCategoryCandidate[],
  counterparty: string | null,
  rawMessage?: string,
): SmsCategoryCandidate | null {
  if (!categories.length) return null;

  const haystack = [counterparty ?? "", rawMessage ?? ""].join(" ").toLowerCase();

  for (const rule of SMS_CATEGORY_RULES) {
    if (!rule.signals.some((signal) => haystack.includes(signal))) continue;
    for (const name of rule.prefer) {
      const hit = findByName(categories, name);
      if (hit) return hit;
    }
  }

  for (const name of SMS_CATEGORY_FALLBACK_NAMES) {
    const hit = findByName(categories, name);
    if (hit) return hit;
  }

  return (
    categories.find((row) => row.bucket === "wants") ?? categories[0] ?? null
  );
}
