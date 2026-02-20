/**
 * Adaptive Budget Advisor
 *
 * Generates personalized recommendations based on spending patterns,
 * budget adherence, and user profile. Behavioral nudge-oriented messages.
 * Phase 2: Context-aware thresholds, impact scoring, deduplication.
 * Phase 4: Message templates, robustness, performance.
 */

import { MESSAGES } from "./advisorMessages";
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
  type:
    | "underspend"
    | "overspend"
    | "reallocate"
    | "goal_progress"
    | "warning"
    | "limit_adjustment"
    | "category_reallocate";
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
  /** Phase 3.2: suggested limit for limit_adjustment */
  suggestedLimit?: number;
  /** Phase 3.2: current limit for limit_adjustment */
  currentLimit?: number;
  /** Phase 3.2: category id for limit_adjustment (to apply change) */
  categoryId?: string;
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

/** Phase 4.2: Guard against NaN, Infinity, negative in calculations */
function safeNum(n: number): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return n;
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

  // Phase 4.3: Early exit for empty inputs
  if (insights.length === 0) return [];

  for (const ins of insights) {
    const spent = safeNum(ins.spent);
    const limit = safeNum(ins.limit);
    if (limit < THRESHOLDS.MIN_LIMIT_FOR_ALERTS) continue;
    const utilization = limit > 0 ? spent / limit : 0;
    const bucket = ins.bucket ?? "wants";
    const nearThreshold = THRESHOLDS.NEAR_LIMIT[bucket];
    const underspendThreshold = THRESHOLDS.UNDERSPEND[bucket];

    // Overspend - high priority
    if (spent > limit) {
      const over = spent - limit;
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
          title: MESSAGES.overspend.title(ins.categoryName),
          message: MESSAGES.overspend.message(ins.categoryName, over),
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
      const remaining = limit - spent;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "warning",
          priority: "medium",
          title: MESSAGES.nearLimit.title(ins.categoryName),
          message:
            daysRemaining <= 7
              ? MESSAGES.nearLimit.messageShort(remaining, daysRemaining)
              : MESSAGES.nearLimit.messageDefault(remaining),
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
      safeNum(ins.avgSpent ?? 0) > 0 &&
      spent < safeNum(ins.avgSpent ?? 0) * 0.7 &&
      (ins.confidence === undefined || ins.confidence >= 0.4)
    ) {
      const key = `underspend-${ins.categoryId}`;
      const saved = limit - spent;
      if (!seen.has(key) && saved > THRESHOLDS.MIN_LIMIT_FOR_ALERTS) {
        seen.add(key);
        recs.push({
          id: key,
          type: "underspend",
          priority: "low",
          title: MESSAGES.underspend.title(ins.categoryName),
          message: MESSAGES.underspend.message(saved),
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
          title: MESSAGES.trendUp.title(ins.categoryName),
          message: MESSAGES.trendUp.message(ins.categoryName),
          context: ins.categoryName,
          _utilization: utilization,
        });
      }
    }
  }

  // Phase 3.1.3: Category-level reallocation within same bucket
  const byBucket = new Map<BudgetBucket, SpendingInsightInput[]>();
  for (const ins of insights) {
    const b = ins.bucket ?? "wants";
    const list = byBucket.get(b) ?? [];
    list.push(ins);
    byBucket.set(b, list);
  }
  for (const [, bucketInsights] of byBucket) {
    const overspent = bucketInsights.filter(
      (i) =>
        safeNum(i.limit) >= THRESHOLDS.MIN_LIMIT_FOR_ALERTS &&
        safeNum(i.spent) > safeNum(i.limit)
    );
    const underspent = bucketInsights.filter((i) => {
      const il = safeNum(i.limit);
      const isp = safeNum(i.spent);
      return (
        il >= THRESHOLDS.MIN_LIMIT_FOR_ALERTS &&
        isp < il &&
        il - isp > THRESHOLDS.MIN_LIMIT_FOR_ALERTS
      );
    });
    for (const over of overspent) {
      const overAmt = safeNum(over.spent) - safeNum(over.limit);
      const key = `cat-realloc-${over.categoryId}`;
      if (seen.has(key)) continue;
      // Pick best underspent source: most headroom
      const bestUnder = underspent
        .filter((u) => u.categoryId !== over.categoryId)
        .sort(
          (a, b) =>
            safeNum(b.limit) -
            safeNum(b.spent) -
            (safeNum(a.limit) - safeNum(a.spent))
        )[0];
      if (!bestUnder) continue;
      const underRoom = safeNum(bestUnder.limit) - safeNum(bestUnder.spent);
      const moveAmt = Math.min(overAmt, underRoom, 500);
      if (moveAmt < THRESHOLDS.MIN_LIMIT_FOR_ALERTS) continue;
      seen.add(key);
      recs.push({
        id: key,
        type: "category_reallocate",
        priority: "medium",
        title: MESSAGES.categoryReallocate.title(),
        message: MESSAGES.categoryReallocate.message(
          moveAmt,
          bestUnder.categoryName,
          over.categoryName
        ),
        amount: moveAmt,
        context: over.categoryName,
        sourceCategory: bestUnder.categoryName,
        targetCategory: over.categoryName,
        actionableAmount: moveAmt,
        canAutoApply: false,
      });
    }
  }

  // Phase 3.2: Smart limit adjustment suggestions
  for (const ins of insights) {
    const il = safeNum(ins.limit);
    const isp = safeNum(ins.spent);
    if (il < THRESHOLDS.MIN_LIMIT_FOR_ALERTS) continue;
    const utilization = il > 0 ? isp / il : 0;
    const avgSpent = safeNum(ins.avgSpent ?? 0);
    const confidence = ins.confidence ?? 0;

    if (isp > il && avgSpent > 0 && confidence >= 0.4) {
      const over = isp - il;
      const suggestedIncrease = Math.max(
        over,
        Math.round((avgSpent - il) * 1.05)
      );
      if (suggestedIncrease <= 0) continue;
      const newLimit = il + Math.min(suggestedIncrease, il * 0.3);
      const roundedNew = Math.round(newLimit);
      const key = `limit-increase-${ins.categoryId}`;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "limit_adjustment",
          priority: "medium",
          title: MESSAGES.limitIncrease.title(ins.categoryName),
          message: MESSAGES.limitIncrease.message(ins.categoryName, roundedNew),
          amount: roundedNew - il,
          context: ins.categoryName,
          actionLabel: "Update limit",
          actionableAmount: roundedNew - il,
          suggestedLimit: roundedNew,
          currentLimit: il,
          categoryId: ins.categoryId,
          canAutoApply: true,
          _utilization: utilization,
        });
      }
    } else if (
      utilization < 0.5 &&
      avgSpent > 0 &&
      isp < avgSpent * 0.7 &&
      confidence >= 0.4
    ) {
      const saved = il - isp;
      if (saved < THRESHOLDS.MIN_LIMIT_FOR_ALERTS) continue;
      const suggestedLimit = Math.max(
        THRESHOLDS.MIN_LIMIT_FOR_ALERTS,
        Math.round(avgSpent * 1.1)
      );
      if (suggestedLimit >= il) continue;
      const key = `limit-decrease-${ins.categoryId}`;
      if (!seen.has(key)) {
        seen.add(key);
        recs.push({
          id: key,
          type: "limit_adjustment",
          priority: "low",
          title: MESSAGES.limitDecrease.title(ins.categoryName),
          message: MESSAGES.limitDecrease.message(suggestedLimit),
          amount: il - suggestedLimit,
          context: ins.categoryName,
          actionLabel: "Update limit",
          actionableAmount: il - suggestedLimit,
          suggestedLimit,
          currentLimit: il,
          categoryId: ins.categoryId,
          canAutoApply: true,
          _utilization: utilization,
        });
      }
    }
  }

  // Bucket-level overspend summary (Phase 2.3: dedup with category context)
  if (bucketTotals) {
    const needsOver =
      safeNum(bucketTotals.needsSpent) - safeNum(bucketTotals.needsLimit);
    if (needsOver > 0) {
      if (!seen.has("bucket-needs")) {
        seen.add("bucket-needs");
        recs.push({
          id: "bucket-needs",
          type: "overspend",
          priority: "high",
          title: MESSAGES.bucketNeeds.title(),
          message: MESSAGES.bucketNeeds.message(needsOver),
          amount: needsOver,
          context: "Needs",
          actionableAmount: needsOver,
        });
      }
    }
    const wantsOver =
      safeNum(bucketTotals.wantsSpent) - safeNum(bucketTotals.wantsLimit);
    if (wantsOver > 0) {
      if (!seen.has("bucket-wants")) {
        seen.add("bucket-wants");
        recs.push({
          id: "bucket-wants",
          type: "overspend",
          priority: "high",
          title: MESSAGES.bucketWants.title(),
          message: MESSAGES.bucketWants.message(wantsOver),
          amount: wantsOver,
          context: "Wants",
          actionableAmount: wantsOver,
        });
      }
    }
  }

  // Phase 3.2: Prefer limit_adjustment over generic overspend for same category
  const limitIncreaseCatIds = new Set(
    recs
      .filter(
        (r) =>
          r.type === "limit_adjustment" &&
          r.categoryId &&
          (r.suggestedLimit ?? 0) > (r.currentLimit ?? 0)
      )
      .map((r) => r.categoryId as string)
  );
  const filtered = recs.filter((r) => {
    if (r.type !== "overspend") return true;
    const m = r.id.match(/^over-(.+)$/);
    return !m || !limitIncreaseCatIds.has(m[1]);
  });

  const deduped = deduplicateRecommendations(filtered, categoryOverByBucket);

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
