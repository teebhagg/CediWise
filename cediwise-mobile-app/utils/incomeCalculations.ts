import type { IncomeSource } from "../types/budget";
import { computeGhanaTax2026Monthly } from "./ghanaTax";

/**
 * Single source of truth for monthly net income from income sources.
 * Primary sources with applyDeductions use Ghana tax net; others use gross amount.
 */
export function getMonthlyNetIncome(incomeSources: IncomeSource[]): number {
  return incomeSources.reduce((sum, src) => {
    if (src.type === "primary" && src.applyDeductions) {
      return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
    }
    return sum + src.amount;
  }, 0);
}
