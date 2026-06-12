/**
 * Ghana-realistic caps for vitals AI suggestions.
 * All percentage caps are applied to net monthly budget income.
 */

export type LifeStageKey =
  | "student"
  | "young_professional"
  | "family"
  | "retiree"
  | string;

export type LineKind =
  | "rent"
  | "food"
  | "utilities"
  | "entertainment"
  | "subscriptions"
  | "other_wants"
  | "other";

const RENT_PATTERN = /\b(rent|housing|accommodation|landlord)\b/i;
const FOOD_PATTERN = /\b(groceries|grocery|food|provisions|market)\b/i;
const UTILITIES_PATTERN =
  /\b(utilities|utility|ecg|electricity|water|trash|ghana water)\b/i;
const ENTERTAINMENT_PATTERN =
  /\b(entertainment|movies|cinema|nightlife|games|hobbies|fun)\b/i;
const SUBSCRIPTIONS_PATTERN =
  /\b(subscriptions?|netflix|spotify|streaming|dstv|apple music)\b/i;
const DINING_PATTERN = /\b(dining\s*out|dining|restaurant|eating\s*out)\b/i;

/** Absolute monthly utilities ceiling by life stage (GHS). */
export const UTILITIES_CAP_BY_LIFE_STAGE: Record<string, number> = {
  student: 500,
  young_professional: 800,
  family: 1200,
  retiree: 700,
};

export const CATEGORY_CAP_PCT = {
  rent: 0.3,
  food: 0.3,
  entertainment: 0.1,
  subscriptions: 0.1,
  otherWants: 0.08,
} as const;

export function classifySuggestionLine(name: string, bucket: string): LineKind {
  if (bucket === "wants") {
    if (SUBSCRIPTIONS_PATTERN.test(name)) return "subscriptions";
    if (ENTERTAINMENT_PATTERN.test(name)) return "entertainment";
    if (DINING_PATTERN.test(name)) return "other_wants";
    return "other_wants";
  }
  if (bucket === "needs") {
    if (RENT_PATTERN.test(name)) return "rent";
    if (FOOD_PATTERN.test(name)) return "food";
    if (UTILITIES_PATTERN.test(name)) return "utilities";
  }
  return "other";
}

export function utilitiesAbsoluteCap(lifeStage: LifeStageKey | null | undefined): number {
  if (!lifeStage) return UTILITIES_CAP_BY_LIFE_STAGE.young_professional;
  return (
    UTILITIES_CAP_BY_LIFE_STAGE[lifeStage] ??
    UTILITIES_CAP_BY_LIFE_STAGE.young_professional
  );
}

export function getLineCapAmount(
  name: string,
  bucket: string,
  netIncome: number,
  lifeStage: LifeStageKey | null | undefined,
): number | null {
  const income = Math.max(0, netIncome);
  const kind = classifySuggestionLine(name, bucket);

  switch (kind) {
    case "rent":
      return roundMoney(income * CATEGORY_CAP_PCT.rent);
    case "food":
      return roundMoney(income * CATEGORY_CAP_PCT.food);
    case "utilities": {
      const pctCap = roundMoney(income * 0.15);
      return Math.min(utilitiesAbsoluteCap(lifeStage), pctCap);
    }
    case "entertainment":
      return roundMoney(income * CATEGORY_CAP_PCT.entertainment);
    case "subscriptions":
      return roundMoney(income * CATEGORY_CAP_PCT.subscriptions);
    case "other_wants":
      return roundMoney(income * CATEGORY_CAP_PCT.otherWants);
    default:
      return null;
  }
}

export function formatConstraintBlock(
  netIncome: number,
  lifeStage: LifeStageKey | null | undefined,
): string {
  const income = Math.max(0, netIncome);
  const utilCap = utilitiesAbsoluteCap(lifeStage);
  const stageLabel = lifeStage ?? "young_professional (default)";

  return `
=== HARD CAPS (enforce strictly; net income = ${income} GHS) ===
Life stage for utilities: ${stageLabel}
- Rent / Housing: max ${roundMoney(income * CATEGORY_CAP_PCT.rent)} GHS (30% of net)
- Groceries / Food: max ${roundMoney(income * CATEGORY_CAP_PCT.food)} GHS (30% of net)
- Utilities (ECG, Water, etc.): max ${utilCap} GHS absolute for this life stage (also max 15% of net)
- Entertainment: max ${roundMoney(income * CATEGORY_CAP_PCT.entertainment)} GHS (10% of net) — NOT subscriptions
- Subscriptions: max ${roundMoney(income * CATEGORY_CAP_PCT.subscriptions)} GHS (10% of net) — separate line
- Each other wants line (Dining Out, Clothing, Data, etc.): max ${roundMoney(income * CATEGORY_CAP_PCT.otherWants)} GHS (8% of net each)
- Sum of ALL suggestedLimit + amount values MUST NOT exceed ${income} GHS
- Each bucket (needs/wants/savings) should sum to its budgetSplit share; never exceed per-line caps when scaling
`.trim();
}

function roundMoney(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}
