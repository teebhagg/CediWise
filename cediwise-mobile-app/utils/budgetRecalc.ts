import {
  computeWeightedCategoryLimits,
  type CategoryLimitInput,
} from "../calculators/category-weights";
import type { BudgetBucket, BudgetCycle, BudgetState } from "../types/budget";
import {
  blendAllocation,
  getHistoricalAvgByCategory,
} from "./allocationBlending";
import { computeGhanaTax2026Monthly } from "./ghanaTax";

/**
 * Recalculate category limits from current allocations using weighted distribution.
 * Categories with manualOverride are preserved. Uses intelligent weights so Rent
 * gets more than Trash, etc., instead of equal split.
 */
export function recalculateBudgetFromAllocations(
  state: BudgetState
): BudgetState {
  const activeCycle = getActiveCycle(state);
  if (!activeCycle) return state;

  const monthlyNetIncome = state.incomeSources.reduce((sum, src) => {
    if (src.type === "primary" && src.applyDeductions) {
      return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
    }
    return sum + src.amount;
  }, 0);

  const bucketTotals: Record<BudgetBucket, number> = {
    needs: monthlyNetIncome * activeCycle.needsPct,
    wants: monthlyNetIncome * activeCycle.wantsPct,
    savings: monthlyNetIncome * activeCycle.savingsPct,
  };

  const cycleCats = state.categories.filter(
    (c) => c.cycleId === activeCycle.id
  );

  const now = new Date().toISOString();
  const limitsByBucketAndName = new Map<string, number>();

  for (const bucket of ["needs", "wants", "savings"] as const) {
    const bucketCats = cycleCats.filter((c) => c.bucket === bucket);
    const inputs: CategoryLimitInput[] = bucketCats.map((c) => ({
      name: c.name,
      bucket,
      fixedAmount: undefined,
      manualOverride: c.manualOverride,
    }));
    const limits = computeWeightedCategoryLimits(
      bucketTotals[bucket],
      inputs,
      state.prefs?.lifeStage ?? null
    );
    limits.forEach((amt, name) =>
      limitsByBucketAndName.set(`${bucket}:${name}`, amt)
    );
  }

  const historical = getHistoricalAvgByCategory(state, activeCycle.id);

  const nextCategories = state.categories.map((c) => {
    if (c.cycleId !== activeCycle.id) return c;
    if (c.manualOverride) return c;
    const templateLimit = limitsByBucketAndName.get(`${c.bucket}:${c.name}`);
    if (templateLimit == null) return c;

    const hist = historical.get(`${c.bucket}:${c.name}`);
    const limit = blendAllocation(
      templateLimit,
      hist?.avgSpent ?? null,
      hist?.variance ?? 0,
      hist?.cycleCount ?? 0
    );

    return {
      ...c,
      limitAmount: limit,
      updatedAt: now,
    };
  });

  return {
    ...state,
    categories: nextCategories,
    updatedAt: now,
  };
}

function getActiveCycle(state: BudgetState): BudgetCycle | null {
  if (!state.cycles.length) return null;
  const sorted = [...state.cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  return sorted[0] ?? null;
}
