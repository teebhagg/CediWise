import type { BudgetBucket, BudgetEnforcement } from "@/types/budget";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";

type ValidationReason = "bucket" | "income" | "survival";

export function trackBudgetPlanValidationFailed(params: {
  reason: ValidationReason;
  overflowAmount: number;
  bucket?: BudgetBucket;
}) {
  getPostHogOptional()?.capture("budget_plan_validation_failed", params);
}

export function trackBudgetReconcileShown(params: {
  source: "setup" | "categories" | "budget" | "edit";
}) {
  getPostHogOptional()?.capture("budget_reconcile_shown", params);
}

export function trackBudgetReconcileApplied(params: {
  method: "auto" | "manual" | "split_adjust";
}) {
  getPostHogOptional()?.capture("budget_reconcile_applied", params);
}

export function trackBudgetReconcileDismissed(params: {
  enforcement: BudgetEnforcement;
}) {
  getPostHogOptional()?.capture("budget_reconcile_dismissed", params);
}

export function trackBudgetEnforcementChanged(params: {
  from: BudgetEnforcement;
  to: BudgetEnforcement;
}) {
  getPostHogOptional()?.capture("budget_enforcement_changed", params);
}

export function trackBudgetOverNetAcknowledged(params: {
  overflowAmount: number;
  source: "edit" | "reconcile";
}) {
  getPostHogOptional()?.capture("budget_over_net_acknowledged", params);
}

export function trackBudgetUnassignedSlack(params: { amount: number }) {
  getPostHogOptional()?.capture("budget_unassigned_slack", params);
}
