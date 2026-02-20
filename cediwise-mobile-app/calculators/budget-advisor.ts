/**
 * Adaptive Budget Advisor
 *
 * Generates personalized recommendations based on spending patterns,
 * budget adherence, and user profile. Behavioral nudge-oriented messages.
 * Phase 2: Context-aware thresholds, impact scoring, deduplication.
 */

import {
  getDaysRemainingInCycle,
  getUrgencyMultiplier,
  THRESHOLDS,
  type BudgetBucket,
} from "./thresholds";

export type SpendingInsightInput = {
  categoryId: string;
  categoryName: string;
  bucket?: BudgetBucket;
  spent: number;
  limit: number;
  avgSpent?: number;
  trend?: "increasing" | "stable" | "decreasing";
  /** Phase 1.1: used to avoid noisy underspend suggestions */
  variance?: number;
  /** Phase 1.1: 0–1; only suggest underspend when confidence >= threshold */
  confidence?: number;
};

export type AdvisorRecommendation = {
  id: string;
  type: "underspend" | "overspend" | "reallocate" | "goal_progress" | "warning";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  actionLabel?: string;
  /** Amount in GHS if relevant */
  amount?: number;
  /** Category or bucket context */
  context?: string;
  /** Phase 2.3: actionable amount (e.g. "Reduce by ₵X") */
  actionableAmount?: number;
  sourceCategory?: string;
  targetCategory?: string;
  canAutoApply?: boolean;
  /** For impact scoring */
  _utilization?: number;
  _daysRemaining?: number;
};

/** Phase 2.2: Category importance for weighting overspend penalties */
const CATEGORY_IMPORTANCE: Record<string, number> = {
  Rent: 3.0,
  "School Fees": 2.5,
  Groceries: 2.0,
  Transport: 1.5,
  ECG: 1.5,
  "Ghana Water": 1.5,
  Tithes: 1.2,
  "Dining Out": 0.8,
  Entertainment: 0.5,
  "Data Bundles": 0.7,
  Clothing: 0.6,
  Subscriptions: 0.6,
  "Emergency Fund": 1.5,
  Savings: 1.2,
};

function getImportance(categoryName: string): number {
  return CATEGORY_IMPORTANCE[categoryName] ?? 1.0;
}

/** Phase 2.1 / 2.3: Calculate impact score for prioritization */
function calculateImpact(
  rec: AdvisorRecommendation,
  daysRemaining: number
): number {
  const amount = rec.amount ?? 0;
  const utilization = rec._utilization ?? 0;
  const urgency = getUrgencyMultiplier(daysRemaining, utilization);
  const importance = rec.context ? getImportance(rec.context) : 1;
  let impact = amount * urgency * importance;
  if (rec.type === "overspend") impact *= 1.5;
  return impact;
}

/** Phase 2.3: Deduplicate - prefer bucket-level overspend, merge category context */
function deduplicateRecommendations(
  recs: AdvisorRecommendation[],
  categoryOverByBucket: Map<string, string[]>
): AdvisorRecommendation[] {
  const out: AdvisorRecommendation[] = [];
  const skipCategoryOver = new Set<string>();

  for (const rec of recs) {
    if (rec.id.startsWith("bucket-")) {
      const bucket = rec.context?.toLowerCase() ?? "";
      const categories = categoryOverByBucket.get(bucket);
      if (categories && categories.length > 0) {
        rec.message =
          rec.message +
          ` (${categories.slice(0, 3).join(", ")}${
            categories.length > 3 ? "…" : ""
          })`;
        categories.forEach((c) => skipCategoryOver.add(c));
      }
      out.push(rec);
    } else if (
      rec.type === "overspend" &&
      rec.context &&
      skipCategoryOver.has(rec.context)
    ) {
      continue;
    } else {
      out.push(rec);
    }
  }
  return out;
}

/**
 * Generate advisor recommendations from spending insights.
 * Phase 2: Uses context-aware thresholds, impact scoring, deduplication.
 */
export function generateAdvisorRecommendations(
  insights: SpendingInsightInput[],
  bucketTotals?: {
    needsSpent: number;
    wantsSpent: number;
    savingsSpent: number;
    needsLimit: number;
    wantsLimit: number;
    savingsLimit: number;
  },
  options?: { cycleEndDate?: string }
): AdvisorRecommendation[] {
  const recs: AdvisorRecommendation[] = [];
  const seen = new Set<string>();
  const daysRemaining = options?.cycleEndDate
    ? getDaysRemainingInCycle(options.cycleEndDate)
    : 30;
  const categoryOverByBucket = new Map<string, string[]>();

  for (const ins of insights) {
    const utilization = ins.limit > 0 ? ins.spent / ins.limit : 0;
    const bucket = ins.bucket ?? "wants";
    const nearThreshold = THRESHOLDS.NEAR_LIMIT[bucket];
    const underspendThreshold = THRESHOLDS.UNDERSPEND[bucket];
    if (ins.limit < THRESHOLDS.MIN_LIMIT_FOR_ALERTS) continue;

    // Overspend - high priority
    if (ins.spent > ins.limit) {
      const over = ins.spent - ins.limit;
      const key = `over-${ins.categoryId}`;
      if (!seen.has(key)) {
        seen.add(key);
        const list = categoryOverByBucket.get(bucket) ?? [];
        list.push(ins.categoryName);
        categoryOverByBucket.set(bucket, list);
        recs.push({
          id: key,
          type: "overspend",
          priority: "high",
          title: `${ins.categoryName} over limit`,
          message: `You've exceeded your ${
            ins.categoryName
          } limit by ₵${formatNum(
            over
          )}. Consider reducing spending in other wants categories next cycle.`,
          amount: over,
          context: ins.categoryName,
          actionableAmount: over,
          _utilization: utilization,
          _daysRemaining: daysRemaining,
        });
      }
    }

    // Near limit - warning (bucket-specific threshold)
    else if (utilization >= nearThreshold && utilization < 1) {
      const key = `near-${ins.categoryId}`;
      const remaining = ins.limit - ins.spent;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "warning",
          priority: "medium",
          title: `Approaching ${ins.categoryName} limit`,
          message:
            daysRemaining <= 7
              ? `You have ₵${formatNum(
                  remaining
                )} left with ${daysRemaining} days remaining. Spend carefully.`
              : `You have ₵${formatNum(
                  remaining
                )} left. Spend carefully to stay on track.`,
          amount: remaining,
          context: ins.categoryName,
          actionLabel: "View spending",
          _utilization: utilization,
          _daysRemaining: daysRemaining,
        });
      }
    }

    // Underspend: bucket-specific; never for needs (Phase 2.1)
    else if (
      underspendThreshold !== null &&
      utilization < underspendThreshold &&
      (ins.avgSpent ?? 0) > 0 &&
      ins.spent < (ins.avgSpent ?? 0) * 0.7 &&
      (ins.confidence === undefined || ins.confidence >= 0.4)
    ) {
      const key = `underspend-${ins.categoryId}`;
      const saved = ins.limit - ins.spent;
      if (!seen.has(key) && saved > THRESHOLDS.MIN_LIMIT_FOR_ALERTS) {
        seen.add(key);
        recs.push({
          id: key,
          type: "underspend",
          priority: "low",
          title: `You saved on ${ins.categoryName}`,
          message: `You spent ₵${formatNum(
            saved
          )} less than budgeted. Consider moving this to your Emergency Fund or a savings goal.`,
          amount: saved,
          context: ins.categoryName,
          actionLabel: "Reallocate",
          actionableAmount: saved,
          _utilization: utilization,
        });
      }
    }

    // Increasing trend
    if (ins.trend === "increasing" && utilization > 0.7) {
      const key = `trend-${ins.categoryId}`;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "warning",
          priority: "medium",
          title: `${ins.categoryName} trending up`,
          message: `Your spending in ${ins.categoryName} has been increasing. Watch this category to avoid overspending.`,
          context: ins.categoryName,
          _utilization: utilization,
        });
      }
    }
  }

  // Bucket-level overspend summary (Phase 2.3: dedup with category context)
  if (bucketTotals) {
    if (bucketTotals.needsSpent > bucketTotals.needsLimit) {
      const over = bucketTotals.needsSpent - bucketTotals.needsLimit;
      if (!seen.has("bucket-needs")) {
        seen.add("bucket-needs");
        recs.push({
          id: "bucket-needs",
          type: "overspend",
          priority: "high",
          title: "Needs bucket over budget",
          message: `Essential spending exceeded by ₵${formatNum(
            over
          )}. Review your needs categories—you may need to adjust next cycle.`,
          amount: over,
          context: "Needs",
          actionableAmount: over,
        });
      }
    }
    if (bucketTotals.wantsSpent > bucketTotals.wantsLimit) {
      const over = bucketTotals.wantsSpent - bucketTotals.wantsLimit;
      if (!seen.has("bucket-wants")) {
        seen.add("bucket-wants");
        recs.push({
          id: "bucket-wants",
          type: "overspend",
          priority: "high",
          title: "Wants bucket over budget",
          message: `Discretionary spending exceeded by ₵${formatNum(
            over
          )}. Try cutting back on non-essentials next month.`,
          amount: over,
          context: "Wants",
          actionableAmount: over,
        });
      }
    }
  }

  const deduped = deduplicateRecommendations(recs, categoryOverByBucket);

  // Phase 2.3: Sort by impact, take top 5
  const withImpact = deduped.map((r) => ({
    rec: r,
    impact: calculateImpact(r, daysRemaining),
  }));
  withImpact.sort((a, b) => b.impact - a.impact);
  const top = withImpact.slice(0, 5).map((x) => x.rec);

  // Strip internal fields before return
  return top.map((r) => {
    const { _utilization, _daysRemaining, ...rest } = r;
    return rest;
  });
}

function formatNum(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type BudgetHealthInput = {
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
  /** Number of categories over limit */
  categoriesOver: number;
  /** Total categories with limits */
  categoriesTotal: number;
  /** Phase 2.2: per-category overspend for importance weighting */
  categoryOverDetails?: { categoryName: string; overAmount: number }[];
  /** Phase 2.2: overspend trend for score adjustment */
  overspendTrend?: "increasing" | "stable" | "decreasing";
  /** Phase 2.2: savings consistently >= 80% over last cycles */
  savingsConsistent?: boolean;
  /** Phase 2.2: savings trend */
  savingsTrend?: "increasing" | "stable" | "decreasing";
};

/**
 * Compute a 0-100 budget health score from adherence and spending.
 * Phase 2.2: Category importance, trend adjustment, savings consistency.
 */
export function computeBudgetHealthScore(input: BudgetHealthInput): {
  score: number;
  summary: string;
} {
  const {
    needsSpent,
    wantsSpent,
    savingsSpent,
    needsLimit,
    wantsLimit,
    savingsLimit,
    categoriesOver,
    categoriesTotal,
    categoryOverDetails,
    overspendTrend,
    savingsConsistent,
    savingsTrend,
  } = input;

  let score = 100;

  if (needsLimit > 0 && needsSpent > needsLimit) {
    const overPct = (needsSpent - needsLimit) / needsLimit;
    let penalty = Math.min(30, overPct * 100);
    if (categoryOverDetails && categoryOverDetails.length > 0) {
      const totalOver = categoryOverDetails.reduce(
        (s, c) => s + c.overAmount,
        0
      );
      const avgImportance =
        totalOver > 0
          ? categoryOverDetails.reduce(
              (s, c) => s + getImportance(c.categoryName) * c.overAmount,
              0
            ) / totalOver
          : 1;
      penalty *= Math.min(1.5, avgImportance);
    }
    if (overspendTrend === "increasing") penalty = Math.min(35, penalty + 5);
    else if (overspendTrend === "decreasing")
      penalty = Math.max(0, penalty - 2);
    score -= penalty;
  }
  if (wantsLimit > 0 && wantsSpent > wantsLimit) {
    const overPct = (wantsSpent - wantsLimit) / wantsLimit;
    let penalty = Math.min(20, overPct * 80);
    if (overspendTrend === "increasing") penalty = Math.min(25, penalty + 5);
    else if (overspendTrend === "decreasing")
      penalty = Math.max(0, penalty - 2);
    score -= penalty;
  }
  if (categoriesTotal > 0) {
    const overRatio = categoriesOver / categoriesTotal;
    score -= Math.min(25, overRatio * 50);
  }
  if (savingsLimit > 0 && savingsSpent >= savingsLimit * 0.5) {
    score += 5;
  }
  if (savingsConsistent) {
    score += 10;
  }
  if (savingsTrend === "increasing") {
    score += 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let summary = "Staying within your budget.";
  if (score < 50) summary = "Review overspent categories.";
  else if (score < 75) summary = "A few categories need attention.";
  else if (savingsSpent >= savingsLimit * 0.8 && savingsLimit > 0)
    summary = "Strong savings this cycle.";
  if (savingsConsistent) summary = "Consistent saver. Well done.";

  return { score, summary };
}
