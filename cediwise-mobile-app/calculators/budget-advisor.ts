/**
 * Adaptive Budget Advisor
 *
 * Generates personalized recommendations based on spending patterns,
 * budget adherence, and user profile. Behavioral nudge-oriented messages.
 */

export type SpendingInsightInput = {
  categoryId: string;
  categoryName: string;
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
};

/**
 * Generate advisor recommendations from spending insights.
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
  }
): AdvisorRecommendation[] {
  const recs: AdvisorRecommendation[] = [];
  const seen = new Set<string>();

  for (const ins of insights) {
    const utilization = ins.limit > 0 ? ins.spent / ins.limit : 0;

    // Overspend - high priority
    if (ins.spent > ins.limit) {
      const over = ins.spent - ins.limit;
      const key = `over-${ins.categoryId}`;
      if (!seen.has(key)) {
        seen.add(key);
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
        });
      }
    }

    // Near limit - warning
    else if (utilization >= 0.85 && utilization < 1) {
      const key = `near-${ins.categoryId}`;
      const remaining = ins.limit - ins.spent;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "warning",
          priority: "medium",
          title: `Approaching ${ins.categoryName} limit`,
          message: `You have ₵${formatNum(
            remaining
          )} left. Spend carefully to stay on track.`,
          amount: remaining,
          context: ins.categoryName,
          actionLabel: "View spending",
        });
      }
    }

    // Underspend: only when insight already passed variance-aware check (Phase 1.1)
    // and confidence is sufficient (or not provided for backward compat)
    else if (
      utilization < 0.5 &&
      (ins.avgSpent ?? 0) > 0 &&
      ins.spent < (ins.avgSpent ?? 0) * 0.7 &&
      (ins.confidence === undefined || ins.confidence >= 0.4)
    ) {
      const key = `underspend-${ins.categoryId}`;
      const saved = ins.limit - ins.spent;
      if (!seen.has(key) && saved > 50) {
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
        });
      }
    }
  }

  // Bucket-level overspend summary
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
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs.slice(0, 5);
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
};

/**
 * Compute a 0-100 budget health score from adherence and spending.
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
  } = input;

  let score = 100;

  if (needsLimit > 0 && needsSpent > needsLimit) {
    const overPct = (needsSpent - needsLimit) / needsLimit;
    score -= Math.min(30, overPct * 100);
  }
  if (wantsLimit > 0 && wantsSpent > wantsLimit) {
    const overPct = (wantsSpent - wantsLimit) / wantsLimit;
    score -= Math.min(20, overPct * 80);
  }
  if (categoriesTotal > 0) {
    const overRatio = categoriesOver / categoriesTotal;
    score -= Math.min(25, overRatio * 50);
  }
  if (savingsLimit > 0 && savingsSpent >= savingsLimit * 0.5) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let summary = "Staying within your budget.";
  if (score < 50) summary = "Review overspent categories.";
  else if (score < 75) summary = "A few categories need attention.";
  else if (savingsSpent >= savingsLimit * 0.8 && savingsLimit > 0)
    summary = "Strong savings this cycle.";

  return { score, summary };
}
