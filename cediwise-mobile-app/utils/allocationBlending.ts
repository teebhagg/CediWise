/**
 * Phase 1.2: Blend template allocation with user's historical spending.
 * When we have 2+ cycles of data, blend weighted template with user avg.
 */

import type { BudgetState } from "@/types/budget";
import { computeConfidence } from "./spendingPatternsLogic";

const BLEND_MAX_RATIO = 0.7; // Max 70% user data, 30% template
const USER_BUFFER = 1.1; // User-based limit = avgSpent * 1.1
const MIN_CYCLES_FOR_BLEND = 2;

export type HistoricalAvg = {
  avgSpent: number;
  cycleCount: number;
  variance: number;
};

/**
 * Compute historical avg spent by (bucket, categoryName) from state.
 * Excludes the given cycle (e.g. current) so we use only past data.
 */
export function getHistoricalAvgByCategory(
  state: BudgetState,
  excludeCycleId?: string
): Map<string, HistoricalAvg> {
  const result = new Map<string, HistoricalAvg>();
  const cycleIds = state.cycles
    .filter((c) => c.id !== excludeCycleId)
    .map((c) => c.id);

  if (cycleIds.length < MIN_CYCLES_FOR_BLEND) return result;

  const spentByKeyAndCycle = new Map<string, number[]>();

  for (const cycleId of cycleIds) {
    const cycleCats = state.categories.filter((c) => c.cycleId === cycleId);
    for (const cat of cycleCats) {
      const key = `${cat.bucket}:${cat.name}`;
      const spent = state.transactions
        .filter((t) => t.cycleId === cycleId && t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);

      if (!spentByKeyAndCycle.has(key)) {
        spentByKeyAndCycle.set(key, []);
      }
      spentByKeyAndCycle.get(key)!.push(spent);
    }
  }

  for (const [key, amounts] of spentByKeyAndCycle) {
    if (amounts.length < MIN_CYCLES_FOR_BLEND) continue;
    const avgSpent = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance =
      amounts.length > 1
        ? Math.sqrt(
            amounts.reduce((s, a) => s + Math.pow(a - avgSpent, 2), 0) /
              amounts.length
          )
        : 0;

    result.set(key, {
      avgSpent,
      cycleCount: amounts.length,
      variance,
    });
  }

  return result;
}

/**
 * Blend template limit with user's historical avg when we have enough data.
 * Returns blended limit or template if no/in sufficient history.
 */
export function blendAllocation(
  templateLimit: number,
  userAvgSpent: number | null,
  variance: number,
  cycleCount: number
): number {
  if (
    userAvgSpent == null ||
    userAvgSpent <= 0 ||
    cycleCount < MIN_CYCLES_FOR_BLEND
  ) {
    return templateLimit;
  }

  const confidence = computeConfidence(cycleCount, variance, userAvgSpent);
  if (confidence < 0.3) return templateLimit;

  const userBased = userAvgSpent * USER_BUFFER;
  const blendRatio = Math.min(confidence, BLEND_MAX_RATIO);

  const blended = templateLimit * (1 - blendRatio) + userBased * blendRatio;

  return Math.max(0, Math.round(blended * 100) / 100);
}
