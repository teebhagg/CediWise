import type { BudgetBucket } from "@/types/budget";
import {
  buildMinimalCategoryNames,
  isWantsOthersCategoryName,
} from "@/utils/budgetCategorySeeding";
import { distributeWithinBuckets } from "@/utils/distributeWithinBuckets";
import {
  computeBucketEnvelopes,
  validateBudgetPlan,
} from "@/utils/budgetPlanValidation";

export type SimulateVitalsBudgetPlanParams = {
  takeHome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  categories: { name: string; bucket: BudgetBucket; limit: number }[];
  lifeStage?:
    | "student"
    | "young_professional"
    | "family"
    | "retiree"
    | null;
};

/**
 * Simulates the post-vitals budget plan (minimal seed + distribution)
 * for AI apply gate and vitals finish validation.
 */
export function simulateVitalsBudgetPlan(
  params: SimulateVitalsBudgetPlanParams,
) {
  const {
    takeHome,
    needsPct,
    wantsPct,
    savingsPct,
    categories,
    lifeStage,
  } = params;

  const customCategories = categories.map((c) => ({
    name: c.name,
    bucket: c.bucket,
    limitAmount: c.limit,
  }));

  const fixedAmountsByCategory: Record<string, number> = {};
  for (const cat of categories) {
    if (cat.limit > 0 && !isWantsOthersCategoryName(cat.bucket, cat.name)) {
      fixedAmountsByCategory[cat.name] = cat.limit;
    }
  }

  const allNames = buildMinimalCategoryNames({
    customCategories,
    fixedAmountsByCategory,
    lifeStage,
  });

  const bucketEnvelopes = computeBucketEnvelopes(takeHome, {
    needsPct,
    wantsPct,
    savingsPct,
  });

  const customLimitByKey = new Map<string, number>();
  for (const cat of customCategories) {
  const key = `${cat.bucket}:${cat.name.trim().toLowerCase()}`;
    if (cat.limitAmount > 0 || isWantsOthersCategoryName(cat.bucket, cat.name)) {
      customLimitByKey.set(
        key,
        isWantsOthersCategoryName(cat.bucket, cat.name) ? 0 : cat.limitAmount,
      );
    }
  }

  const distributionInputs = allNames.map(({ bucket, name }) => {
    const key = `${bucket}:${name.trim().toLowerCase()}`;
    const explicitLimit = customLimitByKey.get(key);
    return {
      name,
      bucket,
      fixedAmount: fixedAmountsByCategory[name],
      explicitLimit,
      manualOverride: explicitLimit != null && explicitLimit > 0,
    };
  });

  const { limitsByKey, overflows } = distributeWithinBuckets({
    bucketEnvelopes,
    categories: distributionInputs,
    lifeStage,
    profile: { lifeStage: lifeStage ?? null },
  });

  const draftCategories = allNames.map(({ bucket, name }) => ({
    bucket,
    limitAmount:
      limitsByKey.get(`${bucket}:${name}`) ??
      customLimitByKey.get(`${bucket}:${name.trim().toLowerCase()}`) ??
      0,
    manualOverride:
      (fixedAmountsByCategory[name] ?? 0) > 0 ||
      (customLimitByKey.get(`${bucket}:${name.trim().toLowerCase()}`) ?? 0) > 0,
  }));

  const validation = validateBudgetPlan({
    cycle: { needsPct, wantsPct, savingsPct },
    categories: draftCategories,
    incomeSources: [
      {
        id: "sim",
        userId: "sim",
        name: "Primary",
        type: "primary",
        amount: takeHome,
        applyDeductions: false,
        createdAt: "",
        updatedAt: "",
      },
    ],
  });

  return {
    totalPlanned: validation.totalPlanned,
    takeHome: validation.takeHome,
    valid: validation.valid && overflows.length === 0,
    validation,
    overflows,
    allNames,
  };
}
