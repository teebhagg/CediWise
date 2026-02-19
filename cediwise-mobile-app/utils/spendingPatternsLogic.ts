/**
 * Pure logic for spending pattern analysis (Phase 1.1).
 * No Supabase or app dependencies — safe to use from tests.
 */

import type { SpendingTrend } from "@/types/budget";

export const TREND_CHANGE_RATIO_THRESHOLD = 0.1;
export const MIN_CYCLES_FOR_TREND = 2;
export const UNDERSPEND_MIN_SAVED_PCT = 0.3;
export const UNDERSPEND_VOLATILITY_RATIO = 2;
export const HIGH_VARIANCE_RATIO = 0.35;
export const CONFIDENCE_MIN_CYCLES = 2;
export const CONFIDENCE_STALE_DAYS = 90;

/**
 * Determine spending trend from historical amounts (Phase 1.1).
 * Uses variance-aware thresholds so we don't flag trend when change is within noise.
 */
export function determineTrend(
  amounts: number[],
  variance: number = 0,
  avgSpent: number = 0
): SpendingTrend {
  if (amounts.length < MIN_CYCLES_FOR_TREND) return "stable";

  const midpoint = Math.floor(amounts.length / 2);
  const olderAmounts = amounts.slice(0, midpoint);
  const recentAmounts = amounts.slice(midpoint);

  const olderAvg =
    olderAmounts.reduce((sum, amt) => sum + amt, 0) / olderAmounts.length;
  const recentAvg =
    recentAmounts.reduce((sum, amt) => sum + amt, 0) / recentAmounts.length;

  if (olderAvg <= 0) return "stable";

  const changeRatio = recentAvg / olderAvg;
  const changePct = Math.abs(changeRatio - 1);

  const stdDev =
    variance > 0
      ? variance
      : Math.sqrt(
          amounts.reduce((s, a) => s + Math.pow(a - avgSpent, 2), 0) /
            amounts.length
        );
  const noiseThreshold =
    avgSpent > 0 && stdDev > 0
      ? Math.min(TREND_CHANGE_RATIO_THRESHOLD, (stdDev / avgSpent) * 1.5)
      : TREND_CHANGE_RATIO_THRESHOLD;

  if (changePct <= noiseThreshold) return "stable";
  if (changeRatio > 1 + noiseThreshold) return "increasing";
  if (changeRatio < 1 - noiseThreshold) return "decreasing";
  return "stable";
}

/**
 * Confidence that pattern is reliable (0–1). Used to weight recommendations.
 */
export function computeConfidence(
  cycleCount: number,
  variance: number,
  avgSpent: number,
  lastCalculatedAt?: string
): number {
  if (cycleCount < CONFIDENCE_MIN_CYCLES) return 0;

  let c = 0.5;

  if (cycleCount >= 4) c += 0.2;
  if (cycleCount >= 6) c += 0.1;

  if (avgSpent > 0 && variance >= 0) {
    const cv = variance / avgSpent;
    if (cv <= 0.15) c += 0.2;
    else if (cv <= 0.35) c += 0.1;
    else if (cv > 0.6) c -= 0.2;
  }

  if (lastCalculatedAt) {
    const daysSince =
      (Date.now() - new Date(lastCalculatedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSince > CONFIDENCE_STALE_DAYS) c *= 0.7;
  }

  return Math.max(0, Math.min(1, c));
}

/**
 * Whether to suggest reallocating underspend. Avoids noisy suggestions
 * when spending is volatile unless underspend is large (z >= 2).
 */
export function shouldSuggestUnderspend(
  spent: number,
  avgSpent: number,
  variance: number,
  limit: number
): boolean {
  if (avgSpent <= 0 || limit <= 0) return false;
  const utilization = spent / limit;
  if (utilization >= 0.5) return false;
  if (spent >= avgSpent * (1 - UNDERSPEND_MIN_SAVED_PCT)) return false;

  const isHighVariance = variance / avgSpent > HIGH_VARIANCE_RATIO;
  if (!isHighVariance) return true;

  const stdDev = variance;
  const zScore = avgSpent > 0 && stdDev > 0 ? (avgSpent - spent) / stdDev : 0;
  return zScore >= UNDERSPEND_VOLATILITY_RATIO;
}
