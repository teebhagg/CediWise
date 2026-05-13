import type { BudgetState } from "@/types/budget";

/** Fingerprint local cycle state for stale checks (server still uses DB hash). */
export function buildBudgetCycleFingerprint(params: {
  cycleId: string | null | undefined;
  state: BudgetState | null | undefined;
}): string {
  const { cycleId, state } = params;
  if (!cycleId || !state?.categories || !state?.transactions) return "";
  const cats = state.categories.filter((c) => c.cycleId === cycleId);
  const tx = state.transactions.filter((t) => t.cycleId === cycleId);
  const sums = cats
    .map((c) => `${c.id}:${c.limitAmount}`)
    .sort()
    .join("|");
  const spentAgg = cats
    .map((c) => {
      const s = tx
        .filter((t) => t.categoryId === c.id)
        .reduce((acc, t) => acc + t.amount, 0);
      return `${c.id}:${Math.round(s * 100) / 100}`;
    })
    .sort()
    .join("|");
  return `${cycleId}:${sums}:${spentAgg}:${tx.length}`;
}
