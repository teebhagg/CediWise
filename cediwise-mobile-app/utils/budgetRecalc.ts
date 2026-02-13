import type { BudgetBucket, BudgetCycle, BudgetState } from "../types/budget";
import { computeGhanaTax2026Monthly } from "./ghanaTax";

/**
 * Recalculate category limits from current allocations (e.g. 50/30/20).
 * Only updates categories where manualOverride === false; user-intended amounts are preserved.
 */
export function recalculateBudgetFromAllocations(
  state: BudgetState
): BudgetState {
  const activeCycle = getActiveCycle(state);
  if (!activeCycle) return state;

  const monthlyNetIncome = state.incomeSources.reduce((sum, src) => {
    if (src.type === "primary" && src.applyDeductions) {
      return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
    }
    return sum + src.amount;
  }, 0);

  const bucketTotals: Record<BudgetBucket, number> = {
    needs: monthlyNetIncome * activeCycle.needsPct,
    wants: monthlyNetIncome * activeCycle.wantsPct,
    savings: monthlyNetIncome * activeCycle.savingsPct,
  };

  const cycleCats = state.categories.filter(
    (c) => c.cycleId === activeCycle.id
  );
  const counts: Record<BudgetBucket, number> = {
    needs: cycleCats.filter((c) => c.bucket === "needs").length,
    wants: cycleCats.filter((c) => c.bucket === "wants").length,
    savings: cycleCats.filter((c) => c.bucket === "savings").length,
  };

  const now = new Date().toISOString();
  const nextCategories = state.categories.map((c) => {
    if (c.cycleId !== activeCycle.id) return c;
    if (c.manualOverride) return c; // Preserve user-intended amount
    const per =
      counts[c.bucket] > 0 ? bucketTotals[c.bucket] / counts[c.bucket] : 0;
    return {
      ...c,
      limitAmount: Math.max(0, Math.round(per * 100) / 100),
      updatedAt: now,
    };
  });

  return {
    ...state,
    categories: nextCategories,
    updatedAt: now,
  };
}

function getActiveCycle(state: BudgetState): BudgetCycle | null {
  if (!state.cycles.length) return null;
  const sorted = [...state.cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  return sorted[0] ?? null;
}
