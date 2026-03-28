import type { IncomeSource } from "../types/budget";
import { computeGhanaTax2026Monthly } from "./ghanaTax";
import type { TaxConfig } from "./taxSync";

/**
 * Single source of truth for monthly net income from income sources.
 * Primary sources with applyDeductions use Ghana tax net; others use gross amount.
 * @param incomeSources List of income sources
 * @param taxConfig Optional dynamic tax config
 */
export function getMonthlyNetIncome(
  incomeSources: IncomeSource[],
  taxConfig?: TaxConfig
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
