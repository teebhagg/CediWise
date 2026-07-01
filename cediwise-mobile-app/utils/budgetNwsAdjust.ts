import type { BudgetBucket, BudgetCategory, BudgetCycle } from "@/types/budget";
import {
  computeBucketEnvelopes,
  validateBudgetPlan,
} from "@/utils/budgetPlanValidation";
import type { IncomeSource } from "@/types/budget";

export type NwsAllocation = {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

export type NwsAdjustPreview = {
  current: NwsAllocation;
  proposed: NwsAllocation;
  takeHome: number;
  currentEnvelopes: Record<BudgetBucket, number>;
  proposedEnvelopes: Record<BudgetBucket, number>;
  validationAfter: ReturnType<typeof validateBudgetPlan>;
};

export function normalizeNwsAllocation(allocation: NwsAllocation): NwsAllocation {
  const sum = allocation.needsPct + allocation.wantsPct + allocation.savingsPct;
  if (sum <= 0) {
    return { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 };
  }
  return {
    needsPct: allocation.needsPct / sum,
    wantsPct: allocation.wantsPct / sum,
    savingsPct: allocation.savingsPct / sum,
  };
}

export function buildNwsAdjustPreview(params: {
  cycle: Pick<BudgetCycle, "needsPct" | "wantsPct" | "savingsPct">;
  proposed: NwsAllocation;
  categories: Pick<BudgetCategory, "bucket" | "limitAmount" | "manualOverride">[];
  incomeSources: IncomeSource[];
}): NwsAdjustPreview {
  const takeHome = validateBudgetPlan({
    cycle: params.cycle,
    categories: params.categories,
    incomeSources: params.incomeSources,
  }).takeHome;

  const proposed = normalizeNwsAllocation(params.proposed);
  const currentEnvelopes = computeBucketEnvelopes(takeHome, params.cycle);
  const proposedEnvelopes = computeBucketEnvelopes(takeHome, proposed);

  const validationAfter = validateBudgetPlan({
    cycle: proposed,
    categories: params.categories,
    incomeSources: params.incomeSources,
  });

  return {
    current: {
      needsPct: params.cycle.needsPct,
      wantsPct: params.cycle.wantsPct,
      savingsPct: params.cycle.savingsPct,
    },
    proposed,
    takeHome,
    currentEnvelopes,
    proposedEnvelopes,
    validationAfter,
  };
}

/** Suggest raising Needs % when a Needs category exceeds its bucket. */
export function suggestNeedsIncreaseAllocation(
  cycle: Pick<BudgetCycle, "needsPct" | "wantsPct" | "savingsPct">,
  overflowFraction: number,
): NwsAllocation {
  const takeFromWants = Math.min(overflowFraction, cycle.wantsPct * 0.5);
  const takeFromSavings = Math.min(
    overflowFraction - takeFromWants,
    cycle.savingsPct * 0.5,
  );
  return normalizeNwsAllocation({
    needsPct: cycle.needsPct + takeFromWants + takeFromSavings,
    wantsPct: cycle.wantsPct - takeFromWants,
    savingsPct: cycle.savingsPct - takeFromSavings,
  });
}
