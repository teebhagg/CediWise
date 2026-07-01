import type { BudgetEnforcement } from "@/types/budget";

/** Flat tolerance (GHS) per L2/L3 check — not stacked across buckets. */
export const BUDGET_PLAN_TOLERANCE_GHS = 20;

export const NEEDS_GENERAL_CATEGORY_NAME = "General";

export const DEFAULT_BUDGET_ENFORCEMENT: BudgetEnforcement = "strict";

export function normalizeBudgetEnforcement(
  value: string | null | undefined,
): BudgetEnforcement {
  return value === "flexible" ? "flexible" : "strict";
}
