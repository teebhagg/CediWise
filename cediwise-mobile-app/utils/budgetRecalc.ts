import {
  computeWeightedCategoryLimits,
  type CategoryLimitInput,
} from "../calculators/category-weights";
import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
  BudgetState,
  RecurringExpense,
} from "../types/budget";
import {
  blendAllocation,
  getHistoricalAvgByCategory,
} from "./allocationBlending";
import { getMonthlyNetIncome } from "./incomeCalculations";
import {
  filterEffectiveRecurringExpenses,
  toMonthlyEquivalentAmount,
} from "./recurringHelpers";
import type { TaxConfig } from "./taxSync";
import { uuidv4 } from "./uuid";

export type BudgetRecalcOptions = {
  recurringExpenses?: RecurringExpense[];
  taxConfig?: TaxConfig;
};

/**
 * Recalculate category limits from current allocations using weighted distribution.
 * Uses disposable income (net − recurring) for bucket totals when recurring data is supplied.
 * Recurring rows with autoAllocate reserve category limits via fixedAmount.
 */
export function recalculateBudgetFromAllocations(
  state: BudgetState,
  options?: BudgetRecalcOptions,
): BudgetState {
  const activeCycle = getActiveCycle(state);
  if (!activeCycle) return state;

  const recurring = options?.recurringExpenses ?? [];
  const monthlyNetIncome = getMonthlyNetIncome(
    state.incomeSources,
    options?.taxConfig,
  );
  const effectiveRecurring = filterEffectiveRecurringExpenses(
    recurring,
    new Date(),
  );
  const totalRecurringMonthly = effectiveRecurring.reduce(
    (sum, e) => sum + toMonthlyEquivalentAmount(e.amount, e.frequency),
    0,
  );
  const disposableIncome = Math.max(0, monthlyNetIncome - totalRecurringMonthly);

  const bucketTotals: Record<BudgetBucket, number> = {
    needs: disposableIncome * activeCycle.needsPct,
    wants: disposableIncome * activeCycle.wantsPct,
    savings: disposableIncome * activeCycle.savingsPct,
  };

  const now = new Date().toISOString();
  let workingCats = state.categories.filter(
    (c) => c.cycleId === activeCycle.id,
  );

  const reserveAuto = effectiveRecurring.filter((e) => e.autoAllocate);
  const existingNameKeys = new Set(
    workingCats.map((c) => `${c.bucket}:${c.name.trim().toLowerCase()}`),
  );

  const newCats: BudgetCategory[] = [];
  for (const exp of reserveAuto) {
    const monthly = toMonthlyEquivalentAmount(exp.amount, exp.frequency);
    if (monthly <= 0) continue;

    let matched = exp.categoryId
      ? workingCats.find((c) => c.id === exp.categoryId && c.bucket === exp.bucket)
      : undefined;
    if (!matched) {
      matched = workingCats.find(
        (c) =>
          c.bucket === exp.bucket &&
          c.name.trim().toLowerCase() === exp.name.trim().toLowerCase(),
      );
    }
    if (matched) continue;

    const nk = `${exp.bucket}:${exp.name.trim().toLowerCase()}`;
    if (existingNameKeys.has(nk)) continue;
    existingNameKeys.add(nk);

    const sortOrder =
      workingCats.filter((c) => c.bucket === exp.bucket).length +
      newCats.filter((c) => c.bucket === exp.bucket).length;

    newCats.push({
      id: uuidv4(),
      userId: state.userId,
      cycleId: activeCycle.id,
      bucket: exp.bucket,
      name: exp.name.trim(),
      limitAmount: 0,
      isCustom: true,
      parentId: null,
      sortOrder,
      suggestedLimit: null,
      isArchived: false,
      manualOverride: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  workingCats = [...workingCats, ...newCats];

  const fixedByCatId = new Map<string, number>();
  const addFixed = (catId: string, amt: number) => {
    fixedByCatId.set(catId, (fixedByCatId.get(catId) ?? 0) + amt);
  };

  for (const exp of reserveAuto) {
    const monthly = toMonthlyEquivalentAmount(exp.amount, exp.frequency);
    if (monthly <= 0) continue;

    let matched = exp.categoryId
      ? workingCats.find((c) => c.id === exp.categoryId && c.bucket === exp.bucket)
      : undefined;
    if (!matched) {
      matched = workingCats.find(
        (c) =>
          c.bucket === exp.bucket &&
          c.name.trim().toLowerCase() === exp.name.trim().toLowerCase(),
      );
    }
    if (matched) addFixed(matched.id, monthly);
  }

  const limitsByBucketAndName = new Map<string, number>();

  for (const bucket of ["needs", "wants", "savings"] as const) {
    const bucketCats = workingCats.filter((c) => c.bucket === bucket);
    const inputs: CategoryLimitInput[] = bucketCats.map((c) => ({
      name: c.name,
      bucket,
      fixedAmount: fixedByCatId.get(c.id),
      manualOverride: c.manualOverride,
    }));
    const limits = computeWeightedCategoryLimits(
      bucketTotals[bucket],
      inputs,
      state.prefs?.lifeStage ?? null,
    );
    limits.forEach((amt, name) =>
      limitsByBucketAndName.set(`${bucket}:${name}`, amt),
    );
  }

  const historical = getHistoricalAvgByCategory(state, activeCycle.id);

  const nextActiveCats = workingCats.map((c) => {
    if (c.manualOverride && !fixedByCatId.has(c.id)) return c;
    if (c.manualOverride && fixedByCatId.has(c.id)) {
      const templateLimit = limitsByBucketAndName.get(`${c.bucket}:${c.name}`);
      if (templateLimit == null) return c;
      const hist = historical.get(`${c.bucket}:${c.name}`);
      const limit = blendAllocation(
        templateLimit,
        hist?.avgSpent ?? null,
        hist?.variance ?? 0,
        hist?.cycleCount ?? 0,
      );
      return { ...c, limitAmount: limit, updatedAt: now };
    }
    const templateLimit = limitsByBucketAndName.get(`${c.bucket}:${c.name}`);
    if (templateLimit == null) return c;
    const hist = historical.get(`${c.bucket}:${c.name}`);
    const limit = blendAllocation(
      templateLimit,
      hist?.avgSpent ?? null,
      hist?.variance ?? 0,
      hist?.cycleCount ?? 0,
    );
    return { ...c, limitAmount: limit, updatedAt: now };
  });

  const nextCategories = state.categories.map((c) => {
    if (c.cycleId !== activeCycle.id) return c;
    const updated = nextActiveCats.find((x) => x.id === c.id);
    return updated ?? c;
  });

  const existingIds = new Set(nextCategories.map((c) => c.id));
  const appended = newCats.filter((c) => !existingIds.has(c.id));

  return {
    ...state,
    categories: [...nextCategories, ...appended],
    updatedAt: now,
  };
}

function getActiveCycle(state: BudgetState): BudgetCycle | null {
  if (!state.cycles.length) return null;
  const sorted = [...state.cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  return sorted[0] ?? null;
}
