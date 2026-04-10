import type { IncomeSource, RecurringExpense } from "../types/budget";
import { computeGhanaTax2026Monthly } from "./ghanaTax";
import { sumRecurringMonthlyEquivalent } from "./recurringHelpers";
import type { TaxConfig } from "./taxSync";

/**
 * Single source of truth for monthly net income from income sources.
 * Primary sources with applyDeductions use Ghana tax net; others use gross amount.
 * @param incomeSources List of income sources
 * @param taxConfig Optional dynamic tax config
 */
export function getMonthlyNetIncome(
  incomeSources: IncomeSource[],
  taxConfig?: TaxConfig,
): number {
  return incomeSources.reduce((sum, src) => {
    if (src.type === "primary" && src.applyDeductions) {
      return (
        sum + computeGhanaTax2026Monthly(src.amount, taxConfig).netTakeHome
      );
    }
    return sum + src.amount;
  }, 0);
}

/**
 * Net income minus effective recurring commitments (active, in date range).
 * Bucket percentages should apply to `disposableIncome`.
 */
export function getMonthlyDisposableIncome(
  incomeSources: IncomeSource[],
  recurringExpenses: RecurringExpense[],
  taxConfig?: TaxConfig,
): {
  netIncome: number;
  totalRecurringMonthly: number;
  disposableIncome: number;
} {
  const netIncome = getMonthlyNetIncome(incomeSources, taxConfig);
  const totalRecurringMonthly = sumRecurringMonthlyEquivalent(
    recurringExpenses,
    new Date(),
  );
  return {
    netIncome,
    totalRecurringMonthly,
    disposableIncome: Math.max(0, netIncome - totalRecurringMonthly),
  };
}
