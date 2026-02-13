import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
} from "../types/budget";
import { computeGhanaTax2026Monthly } from "./ghanaTax";

export type AllocationExceededResult = {
  exceedsBucket: boolean;
  exceedsIncome: boolean;
  bucketTotal: number;
  currentCategoryLimitSum: number;
  remainder: number;
  debtAmount: number;
  suggestedAllocation: {
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  } | null;
  warnings: string[];
  message: string;
};

function getMonthlyNetIncome(
  incomeSources: { type: string; amount: number; applyDeductions: boolean }[]
): number {
  return incomeSources.reduce((sum, src) => {
    if (src.type === "primary" && src.applyDeductions) {
      return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
    }
    return sum + src.amount;
  }, 0);
}

/**
 * Check impact of adding or updating a category with the given limit.
 * Returns whether bucket/income is exceeded and suggested allocation or debt.
 */
export function checkCategoryLimitImpact(params: {
  cycle: BudgetCycle;
  categories: BudgetCategory[];
  incomeSources: { type: string; amount: number; applyDeductions: boolean }[];
  bucket: BudgetBucket;
  newLimit: number;
  categoryId?: string | null;
}): AllocationExceededResult {
  const { cycle, categories, incomeSources, bucket, newLimit, categoryId } =
    params;

  const monthlyNetIncome = getMonthlyNetIncome(incomeSources);
  const bucketTotals: Record<BudgetBucket, number> = {
    needs: monthlyNetIncome * cycle.needsPct,
    wants: monthlyNetIncome * cycle.wantsPct,
    savings: monthlyNetIncome * cycle.savingsPct,
  };

  const cycleCats = categories.filter((c) => c.cycleId === cycle.id);
  const currentSumByBucket: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  for (const c of cycleCats) {
    if (c.id === categoryId) continue;
    currentSumByBucket[c.bucket] += c.limitAmount;
  }
  const currentCategoryLimitSum = currentSumByBucket[bucket] + newLimit;
  const bucketTotal = bucketTotals[bucket];
  const remainder = Math.max(0, currentCategoryLimitSum - bucketTotal);

  const totalBudgetAfter =
    cycleCats.reduce(
      (s, c) => s + (c.id === categoryId ? 0 : c.limitAmount),
      0
    ) + newLimit;
  const exceedsIncome = totalBudgetAfter > monthlyNetIncome;
  const debtAmount = exceedsIncome
    ? Math.max(0, totalBudgetAfter - monthlyNetIncome)
    : 0;

  const exceedsBucket = remainder > 0;
  const warnings: string[] = [];
  let suggestedAllocation: AllocationExceededResult["suggestedAllocation"] =
    null;

  if (exceedsIncome) {
    warnings.push(
      "This will exceed your total income. Debt will occur; the excess will be added to debts (to be paid next month/cycle)."
    );
  }

  if (exceedsBucket && !exceedsIncome) {
    let needsPct = cycle.needsPct;
    let wantsPct = cycle.wantsPct;
    let savingsPct = cycle.savingsPct;

    if (bucket === "needs") {
      const takeFromWants = Math.min(remainder, bucketTotals.wants);
      if (takeFromWants > 0) {
        wantsPct = Math.max(0, wantsPct - takeFromWants / monthlyNetIncome);
        needsPct = needsPct + takeFromWants / monthlyNetIncome;
        warnings.push(
          "Remainder will be deducted from Wants; allocation % will be updated."
        );
      }
    } else if (bucket === "wants") {
      const takeFromNeeds = Math.min(remainder, bucketTotals.needs);
      const remainingAfterNeeds = remainder - takeFromNeeds;
      const takeFromSavings =
        remainingAfterNeeds > 0
          ? Math.min(remainingAfterNeeds, bucketTotals.savings)
          : 0;
      if (takeFromNeeds > 0) {
        needsPct = Math.max(0, needsPct - takeFromNeeds / monthlyNetIncome);
        wantsPct = wantsPct + takeFromNeeds / monthlyNetIncome;
      }
      if (takeFromSavings > 0) {
        savingsPct = Math.max(
          0,
          savingsPct - takeFromSavings / monthlyNetIncome
        );
        wantsPct = wantsPct + takeFromSavings / monthlyNetIncome;
        warnings.push(
          "Remainder deducted from Need; then from Savings (warning)."
        );
      } else if (takeFromNeeds > 0) {
        warnings.push(
          "Remainder will be deducted from Needs; allocation % will be updated."
        );
      }
    } else if (bucket === "savings") {
      const takeFromWants = Math.min(remainder, bucketTotals.wants);
      const remainingAfterWants = remainder - takeFromWants;
      const takeFromNeeds =
        remainingAfterWants > 0
          ? Math.min(remainingAfterWants, bucketTotals.needs)
          : 0;
      if (takeFromWants > 0) {
        wantsPct = Math.max(0, wantsPct - takeFromWants / monthlyNetIncome);
        savingsPct = savingsPct + takeFromWants / monthlyNetIncome;
      }
      if (takeFromNeeds > 0) {
        needsPct = Math.max(0, needsPct - takeFromNeeds / monthlyNetIncome);
        savingsPct = savingsPct + takeFromNeeds / monthlyNetIncome;
        warnings.push("Remainder deducted from Wants; then from Needs.");
      } else if (takeFromWants > 0) {
        warnings.push(
          "Remainder will be deducted from Wants; allocation % will be updated."
        );
      }
    }

    const total = needsPct + wantsPct + savingsPct;
    if (total > 0.001) {
      const factor = 1 / total;
      suggestedAllocation = {
        needsPct: Math.round(needsPct * factor * 100) / 100,
        wantsPct: Math.round(wantsPct * factor * 100) / 100,
        savingsPct: Math.round(savingsPct * factor * 100) / 100,
      };
    }
  }

  const message = exceedsIncome
    ? "Budget exceeds income. Debt will occur."
    : exceedsBucket
    ? "Budget exceeds allocation for this bucket."
    : "";

  return {
    exceedsBucket,
    exceedsIncome,
    bucketTotal,
    currentCategoryLimitSum,
    remainder,
    debtAmount,
    suggestedAllocation,
    warnings,
    message,
  };
}
