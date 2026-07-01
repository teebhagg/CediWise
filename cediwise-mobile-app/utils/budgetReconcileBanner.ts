import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import {
  getCategoryAllocationViolation,
  hasCategoryAllocationExceeded,
} from "@/utils/budgetPlanValidation";
import { BUDGET_PLAN_TOLERANCE_GHS } from "@/utils/budgetPlanConstants";

const BUCKET_LABELS = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
} as const;

/** Largest actionable overflow for banner re-show comparisons. */
export function getPlanViolationOverflow(
  validation: BudgetPlanValidationResult,
): number {
  const l3 = validation.violations.find((v) => v.type === "L3")?.amount ?? 0;
  if (l3 > BUDGET_PLAN_TOLERANCE_GHS) return l3;
  const l2Amounts = validation.violations
    .filter((v) => v.type === "L2")
    .map((v) => v.amount);
  return l2Amounts.length > 0 ? Math.max(...l2Amounts) : 0;
}

export function getReconcileBannerMessage(
  validation: BudgetPlanValidationResult,
): string {
  const primary = getCategoryAllocationViolation(validation);
  if (!primary) return "Your budget plan needs adjustment.";
  if (primary.type === "L3") {
    return `Your plan is ₵${Math.round(primary.amount)} above take-home pay.`;
  }
  if (primary.type === "L2" && primary.bucket) {
    const label = BUCKET_LABELS[primary.bucket];
    return `${label} is ₵${Math.round(primary.amount)} over your budget.`;
  }
  return "Your budget plan needs adjustment.";
}

export function shouldShowReconcileBanner(params: {
  validation: BudgetPlanValidationResult | null;
  dismissedAt?: string;
  dismissedOverflow?: number;
}): boolean {
  const { validation, dismissedAt, dismissedOverflow } = params;
  if (!validation || !hasCategoryAllocationExceeded(validation)) return false;
  if (!dismissedAt) return true;

  const currentOverflow = getPlanViolationOverflow(validation);
  if (dismissedOverflow == null) return false;

  const worsenedByAmount = currentOverflow - dismissedOverflow;
  if (worsenedByAmount > 50) return true;
  if (dismissedOverflow > 0 && worsenedByAmount / dismissedOverflow > 0.05) {
    return true;
  }
  return false;
}
