import {
  blendAllocation,
  getHistoricalAvgByCategory,
} from "@/utils/allocationBlending";
import type { CategoryLimitInput } from "@/calculators/category-weights";
import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
  BudgetState,
} from "@/types/budget";
import {
  buildMinimalCategoryNames,
  categoryNamesFromFullSeed,
  isNeedsGeneralCategoryName,
  isWantsOthersCategoryName,
  type CategoryNameRef,
} from "@/utils/budgetCategorySeeding";
import { distributeWithinBuckets } from "@/utils/distributeWithinBuckets";
import {
  BudgetPlanSetupError,
  validateBudgetPlan,
} from "@/utils/budgetPlanValidation";
import type { LifeStage } from "@/calculators/budget-intelligence";
import { uuidv4 } from "@/utils/uuid";

export type BudgetSeedMode = "minimal" | "full" | "none";

export type BuildSetupBudgetCategoriesParams = {
  userId: string;
  cycleId: string;
  createdAt: string;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  seedMode: BudgetSeedMode;
  interests?: string[];
  fixedAmountsByCategory?: Record<string, number>;
  customCategories?: {
    name: string;
    bucket: BudgetBucket;
    limitAmount: number;
  }[];
  lifeStage?: LifeStage | null;
  disposableIncome: number;
  mergedFixed: Record<string, number>;
  state: BudgetState;
  skipValidation?: boolean;
};

function categoryKey(bucket: BudgetBucket, name: string): string {
  return `${bucket}:${name.trim().toLowerCase()}`;
}

function resolveCategoryNames(
  params: BuildSetupBudgetCategoriesParams,
): CategoryNameRef[] {
  const {
    seedMode,
    interests,
    customCategories,
    fixedAmountsByCategory,
  } = params;

  if (seedMode === "none") {
    return (customCategories ?? [])
      .filter((c) => c.name.trim())
      .map((c) => ({ bucket: c.bucket, name: c.name.trim() }));
  }

  if (seedMode === "minimal") {
    let names = buildMinimalCategoryNames({
      customCategories,
      fixedAmountsByCategory,
      interests,
      lifeStage: params.lifeStage,
    });
    const keys = new Set(
      names.map((n) => categoryKey(n.bucket, n.name)),
    );
    for (const custom of customCategories ?? []) {
      const normalized = custom.name.trim();
      if (!normalized) continue;
      const key = categoryKey(custom.bucket, normalized);
      if (keys.has(key)) continue;
      keys.add(key);
      names.push({ bucket: custom.bucket, name: normalized });
    }
    return names;
  }

  let names = categoryNamesFromFullSeed(
    interests,
    fixedAmountsByCategory,
    params.lifeStage,
  );
  const keys = new Set(names.map((n) => categoryKey(n.bucket, n.name)));
  for (const custom of customCategories ?? []) {
    const normalized = custom.name.trim();
    if (!normalized) continue;
    const isOthers = isWantsOthersCategoryName(custom.bucket, normalized);
    if (custom.limitAmount <= 0 && !isOthers) continue;
    const key = categoryKey(custom.bucket, normalized);
    if (keys.has(key)) continue;
    keys.add(key);
    names.push({ bucket: custom.bucket, name: normalized });
  }
  return names;
}

export function buildSetupBudgetCategories(
  params: BuildSetupBudgetCategoriesParams,
): BudgetCategory[] {
  const {
    userId,
    cycleId,
    createdAt,
    needsPct,
    wantsPct,
    savingsPct,
    lifeStage,
    disposableIncome,
    mergedFixed,
    state,
    skipValidation,
  } = params;

  const allNames = resolveCategoryNames(params);
  const bucketTotals: Record<BudgetBucket, number> = {
    needs: disposableIncome * needsPct,
    wants: disposableIncome * wantsPct,
    savings: disposableIncome * savingsPct,
  };

  const customLimitByKey = new Map<string, number>();
  for (const custom of params.customCategories ?? []) {
    const normalized = custom.name.trim();
    if (
      !normalized ||
      (custom.limitAmount <= 0 &&
        !isWantsOthersCategoryName(custom.bucket, normalized))
    ) {
      continue;
    }
    customLimitByKey.set(
      categoryKey(custom.bucket, normalized),
      isWantsOthersCategoryName(custom.bucket, normalized)
        ? 0
        : custom.limitAmount,
    );
  }

  const distributionInputs = allNames.map(({ bucket, name }) => {
    const key = categoryKey(bucket, name);
    const explicitLimit = customLimitByKey.get(key);
    return {
      name,
      bucket,
      fixedAmount: mergedFixed[name],
      explicitLimit,
      manualOverride:
        (bucket === "needs" && name.trim().toLowerCase() === "emergency") ||
        isNeedsGeneralCategoryName(bucket, name),
    };
  });

  const { limitsByKey, overflows } = distributeWithinBuckets({
    bucketEnvelopes: bucketTotals,
    categories: distributionInputs,
    lifeStage,
    profile: { lifeStage: lifeStage ?? null },
  });

  const historical = getHistoricalAvgByCategory(state);

  const categories: BudgetCategory[] = allNames.map(({ bucket, name }, index) => {
    const key = categoryKey(bucket, name);
    const rawLimit =
      customLimitByKey.get(key) ??
      limitsByKey.get(`${bucket}:${name}`) ??
      0;
    const hist = historical.get(`${bucket}:${name}`);
    const templateLimit = limitsByKey.get(`${bucket}:${name}`) ?? rawLimit;
    const limitAmount =
      customLimitByKey.has(key) && !isWantsOthersCategoryName(bucket, name)
        ? rawLimit
        : blendAllocation(
            templateLimit,
            hist?.avgSpent ?? null,
            hist?.variance ?? 0,
            hist?.cycleCount ?? 0,
          );
    const isFixed =
      customLimitByKey.has(key) || (mergedFixed[name] ?? 0) > 0;
    return {
      id: uuidv4(),
      userId,
      cycleId,
      bucket,
      name,
      limitAmount: Math.max(0, Math.round(limitAmount * 100) / 100),
      isCustom: customLimitByKey.has(key),
      parentId: null,
      sortOrder: index,
      suggestedLimit: null,
      isArchived: false,
      manualOverride: isFixed,
      createdAt,
      updatedAt: createdAt,
    };
  });

  if (!skipValidation) {
    const cycle: Pick<
      BudgetCycle,
      "needsPct" | "wantsPct" | "savingsPct"
    > = { needsPct, wantsPct, savingsPct };
    const validation = validateBudgetPlan({
      cycle,
      categories,
      incomeSources: state.incomeSources,
    });
    if (!validation.valid || overflows.length > 0) {
      throw new BudgetPlanSetupError(validation);
    }
  }

  return categories;
}
