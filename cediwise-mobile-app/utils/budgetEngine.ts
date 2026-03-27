import type { BudgetEngineMode } from "../types/budget";

export const BUDGET_ENGINE_MODES: BudgetEngineMode[] = [
  "recommend_only",
  "auto_apply_safe_rules",
  "manual_off",
];

export function normalizeBudgetEngineMode(
  value?: string | null
): BudgetEngineMode {
  if (value === "recommend_only") return "recommend_only";
  if (value === "manual_off") return "manual_off";
  return "auto_apply_safe_rules";
}

export function isAutoApplySafeRules(mode?: BudgetEngineMode | null): boolean {
  return normalizeBudgetEngineMode(mode ?? null) === "auto_apply_safe_rules";
}

export function shouldShowBudgetEngineRecommendations(
  mode?: BudgetEngineMode | null
): boolean {
  return normalizeBudgetEngineMode(mode ?? null) !== "manual_off";
}

export function getBudgetEngineModeLabel(
  mode?: BudgetEngineMode | null
): string {
  switch (normalizeBudgetEngineMode(mode ?? null)) {
    case "recommend_only":
      return "Recommend only";
    case "manual_off":
      return "Manual / off";
    case "auto_apply_safe_rules":
    default:
      return "Auto-apply safe rules";
  }
}
