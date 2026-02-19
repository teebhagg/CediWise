/**
 * Weighted Category Allocation
 *
 * Replaces equal-split allocation with intelligent weights based on
 * typical expense proportions for Ghanaian households. Weights adapt
 * to life stage and category presence.
 */

import type { BudgetBucket } from "@/types/budget";

/** Default weights for needs categories. Must sum to 1 within bucket. */
const NEEDS_WEIGHTS: Record<string, number> = {
  Rent: 0.35,
  "School Fees": 0.2,
  Transport: 0.15,
  Groceries: 0.15,
  "Tithes/Church": 0.05,
  ECG: 0.04,
  "Ghana Water": 0.03,
  Trash: 0.01,
  Healthcare: 0.06,
  "Essential Bills": 0.01,
  "Debt Payments": 0.05,
  Utilities: 0.04,
  _default: 0.05,
};

/** Default weights for wants categories */
const WANTS_WEIGHTS: Record<string, number> = {
  "Data Bundles": 0.2,
  "Dining Out": 0.2,
  Subscriptions: 0.15,
  Clothing: 0.15,
  Entertainment: 0.12,
  Gadgets: 0.08,
  Gym: 0.04,
  "Self-care": 0.04,
  Travel: 0.05,
  Games: 0.03,
  Hobbies: 0.05,
  "Shoes & Accessories": 0.04,
  "Skills & Courses": 0.06,
  "Family Outings": 0.06,
  "Minimal Discretionary": 0.2,
  "Essential Entertainment": 0.25,
  _default: 0.06,
};

/** Default weights for savings categories */
const SAVINGS_WEIGHTS: Record<string, number> = {
  "Emergency Fund": 0.4,
  "Susu/Project Savings": 0.25,
  "T-Bills": 0.2,
  "Education Fund": 0.15,
  "Healthcare Reserve": 0.15,
  "Debt Payoff Fund": 0.25,
  _default: 0.25,
};

const BUCKET_WEIGHT_MAPS: Record<BudgetBucket, Record<string, number>> = {
  needs: NEEDS_WEIGHTS,
  wants: WANTS_WEIGHTS,
  savings: SAVINGS_WEIGHTS,
};

export type LifeStage = "student" | "young_professional" | "family" | "retiree";

/**
 * Life-stage adjustments: multiply base weight by this factor for specific categories.
 * Used when certain categories are more relevant (e.g. School Fees for families).
 */
const LIFE_STAGE_WEIGHT_BOOSTS: Partial<
  Record<LifeStage, Record<string, number>>
> = {
  student: {
    Transport: 1.4,
    "Data Bundles": 1.3,
    "School Fees": 1.2,
    Groceries: 1.1,
    Rent: 0.9,
  },
  family: {
    "School Fees": 1.8,
    Groceries: 1.3,
    "Family Outings": 1.5,
    Healthcare: 1.2,
    Rent: 1.1,
  },
  retiree: {
    Healthcare: 1.5,
    Rent: 1.1,
    Groceries: 1.1,
    Entertainment: 1.2,
    Travel: 1.2,
  },
};

/**
 * Get the weight for a category name within a bucket.
 * Uses base weight * life-stage boost (if applicable).
 */
export function getCategoryWeight(
  categoryName: string,
  bucket: BudgetBucket,
  lifeStage?: LifeStage | null
): number {
  const map = BUCKET_WEIGHT_MAPS[bucket];
  let weight = map[categoryName] ?? map._default ?? 0.05;

  if (lifeStage && LIFE_STAGE_WEIGHT_BOOSTS[lifeStage]) {
    const boost = LIFE_STAGE_WEIGHT_BOOSTS[lifeStage]![categoryName];
    if (typeof boost === "number") weight *= boost;
  }

  return Math.max(0.01, weight);
}

export type CategoryLimitInput = {
  name: string;
  bucket: BudgetBucket;
  /** Fixed amount already known (e.g. from vitals: rent, utilities) */
  fixedAmount?: number;
  manualOverride?: boolean;
  currentLimit?: number;
};

/**
 * Compute weighted category limits within a bucket.
 * Categories with fixedAmount use that amount; others share the remainder by weight.
 *
 * @param bucketTotal - Total budget for the bucket (e.g. needsLimit)
 * @param categories - List of categories in the bucket
 * @param lifeStage - Optional life stage for weight adjustments
 * @returns Map of category name -> suggested limit amount
 */
export function computeWeightedCategoryLimits(
  bucketTotal: number,
  categories: CategoryLimitInput[],
  lifeStage?: LifeStage | null
): Map<string, number> {
  const result = new Map<string, number>();

  // 1. Lock in fixed amounts
  const fixedTotal = categories.reduce((sum, c) => {
    const amt = c.fixedAmount ?? 0;
    if (amt > 0) {
      result.set(c.name, amt);
      return sum + amt;
    }
    return sum;
  }, 0);

  const remainder = Math.max(0, bucketTotal - fixedTotal);

  // 2. Categories that need allocation (no fixed amount, no manual override)
  const toAllocate = categories.filter(
    (c) => (c.fixedAmount ?? 0) <= 0 && !c.manualOverride
  );

  if (toAllocate.length === 0) {
    return result;
  }

  // 3. Sum of weights for normalization
  const totalWeight = toAllocate.reduce(
    (s, c) => s + getCategoryWeight(c.name, c.bucket, lifeStage),
    0
  );

  if (totalWeight <= 0) {
    const per = remainder / toAllocate.length;
    toAllocate.forEach((c) => result.set(c.name, Math.round(per * 100) / 100));
    return result;
  }

  // 4. Distribute remainder by weight
  toAllocate.forEach((c) => {
    const w = getCategoryWeight(c.name, c.bucket, lifeStage);
    const share = (w / totalWeight) * remainder;
    result.set(c.name, Math.max(0, Math.round(share * 100) / 100));
  });

  return result;
}

/**
 * Compute limits for all categories given bucket totals and category lists.
 * Used by budget recalc when we have bucket totals (from allocation %) and categories.
 */
export function distributeBucketTotalsToCategories(
  bucketTotals: Record<BudgetBucket, number>,
  categoriesByBucket: Record<
    BudgetBucket,
    { name: string; fixedAmount?: number; manualOverride?: boolean }[]
  >,
  lifeStage?: LifeStage | null
): Map<string, number> {
  const result = new Map<string, number>();

  (["needs", "wants", "savings"] as const).forEach((bucket) => {
    const total = bucketTotals[bucket] ?? 0;
    const cats = categoriesByBucket[bucket] ?? [];
    const inputs: CategoryLimitInput[] = cats.map((c) => ({
      name: c.name,
      bucket,
      fixedAmount: c.fixedAmount,
      manualOverride: c.manualOverride,
    }));
    const limits = computeWeightedCategoryLimits(total, inputs, lifeStage);
    limits.forEach((amt, name) => result.set(name, amt));
  });

  return result;
}
