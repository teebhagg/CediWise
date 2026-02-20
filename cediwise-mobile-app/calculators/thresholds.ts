/**
 * Phase 2.1: Dynamic thresholds for budget advisor.
 * Context-aware: stricter for needs, more lenient for savings.
 */

export type BudgetBucket = "needs" | "wants" | "savings";

export const THRESHOLDS = {
  /** Utilization at which we show "approaching limit" warning (bucket-specific) */
  NEAR_LIMIT: {
    needs: 0.9,
    wants: 0.85,
    savings: 0.8,
  } as const,
  /** Max utilization to suggest underspend reallocation (null = never) */
  UNDERSPEND: {
    needs: null as number | null,
    wants: 0.5,
    savings: 0.4,
  } as const,
  /** Don't alert on categories smaller than this (GHS) */
  MIN_LIMIT_FOR_ALERTS: 50,
} as const;

/**
 * Days remaining in the current budget cycle.
 * endDate: ISO date string (YYYY-MM-DD).
 */
export function getDaysRemainingInCycle(endDate: string): number {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Urgency multiplier for recommendations based on time in cycle.
 * Higher = more urgent (e.g. late cycle + high utilization).
 */
export function getUrgencyMultiplier(
  daysRemaining: number,
  utilization: number
): number {
  if (daysRemaining <= 3 && utilization > 0.8) return 1.5;
  if (daysRemaining <= 7 && utilization > 0.85) return 1.2;
  return 1.0;
}
