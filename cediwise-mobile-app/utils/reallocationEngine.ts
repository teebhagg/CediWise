import type {
  BudgetBucket,
  BudgetCycle,
  BudgetTransaction,
} from "@/types/budget";

export type ReallocationSuggestion = {
  shouldReallocate: boolean;
  reason?: string;
  changes?: {
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  };
  details?: {
    overspentBuckets: Array<{
      bucket: BudgetBucket;
      amount: number;
      percentage: number;
    }>;
    underspentBuckets: Array<{
      bucket: BudgetBucket;
      amount: number;
      percentage: number;
    }>;
  };
};

/**
 * Analyze spending from last cycle and suggest reallocation
 */
export function analyzeAndSuggestReallocation(
  cycle: BudgetCycle,
  transactions: BudgetTransaction[],
  monthlyNetIncome: number
): ReallocationSuggestion {
  if (monthlyNetIncome <= 0) {
    return { shouldReallocate: false };
  }

  // Calculate actual spending by bucket
  const spentByBucket: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };

  for (const tx of transactions.filter((t) => t.cycleId === cycle.id)) {
    spentByBucket[tx.bucket] += tx.amount;
  }

  // Calculate limits by bucket
  const limitsByBucket: Record<BudgetBucket, number> = {
    needs: monthlyNetIncome * cycle.needsPct,
    wants: monthlyNetIncome * cycle.wantsPct,
    savings: monthlyNetIncome * cycle.savingsPct,
  };

  // Calculate over/underspending
  const overspentBuckets: Array<{
    bucket: BudgetBucket;
    amount: number;
    percentage: number;
  }> = [];
  const underspentBuckets: Array<{
    bucket: BudgetBucket;
    amount: number;
    percentage: number;
  }> = [];

  for (const bucket of ["needs", "wants", "savings"] as BudgetBucket[]) {
    const spent = spentByBucket[bucket];
    const limit = limitsByBucket[bucket];
    const diff = spent - limit;
    const percentage = limit > 0 ? diff / limit : 0;

    if (diff > 0 && percentage > 0.1) {
      // Overspent by more than 10%
      overspentBuckets.push({ bucket, amount: diff, percentage });
    } else if (diff < 0 && percentage < -0.15) {
      // Underspent by more than 15%
      underspentBuckets.push({
        bucket,
        amount: Math.abs(diff),
        percentage: Math.abs(percentage),
      });
    }
  }

  // Determine if reallocation is warranted
  if (overspentBuckets.length === 0 || underspentBuckets.length === 0) {
    return { shouldReallocate: false };
  }

  // Calculate new allocations
  let needsPct = cycle.needsPct;
  let wantsPct = cycle.wantsPct;
  let savingsPct = cycle.savingsPct;

  // Priority order: Needs > Savings > Wants
  // If needs overspent, take from wants first, then savings
  // If wants overspent, take from savings first
  // If savings overspent, it's unusual, but take from wants

  const needsOverspent = overspentBuckets.find((b) => b.bucket === "needs");
  const wantsOverspent = overspentBuckets.find((b) => b.bucket === "wants");
  const savingsOverspent = overspentBuckets.find((b) => b.bucket === "savings");

  const needsUnderspent = underspentBuckets.find((b) => b.bucket === "needs");
  const wantsUnderspent = underspentBuckets.find((b) => b.bucket === "wants");
  const savingsUnderspent = underspentBuckets.find(
    (b) => b.bucket === "savings"
  );

  let reason = "";

  if (needsOverspent) {
    // Needs overspent - prioritize needs
    const shiftAmount = Math.min(0.05, needsOverspent.percentage / 2); // Shift 5% or half the overspending

    if (wantsUnderspent) {
      wantsPct = Math.max(0.1, wantsPct - shiftAmount);
      needsPct = needsPct + shiftAmount;
      reason =
        "Increased Needs allocation due to consistent overspending, reduced Wants.";
    } else if (savingsUnderspent) {
      savingsPct = Math.max(0, savingsPct - shiftAmount);
      needsPct = needsPct + shiftAmount;
      reason =
        "Increased Needs allocation due to consistent overspending, reduced Savings.";
    }
  } else if (wantsOverspent && savingsUnderspent) {
    // Wants overspent, savings underspent
    const shiftAmount = Math.min(0.05, wantsOverspent.percentage / 2);

    savingsPct = Math.max(0, savingsPct - shiftAmount);
    wantsPct = wantsPct + shiftAmount;
    reason = "Adjusted Wants allocation due to overspending, reduced Savings.";
  } else if (needsUnderspent && (wantsOverspent || savingsOverspent)) {
    // Needs underspent - can reduce and shift elsewhere
    const shiftAmount = Math.min(
      0.05,
      Math.abs(needsUnderspent.percentage) / 2
    );

    needsPct = needsPct - shiftAmount;

    if (savingsUnderspent) {
      savingsPct = savingsPct + shiftAmount;
      reason =
        "Decreased Needs allocation due to consistent underspending, increased Savings.";
    } else {
      wantsPct = wantsPct + shiftAmount;
      reason =
        "Decreased Needs allocation due to consistent underspending, increased Wants.";
    }
  }

  // Ensure percentages sum to 1
  const total = needsPct + wantsPct + savingsPct;
  if (Math.abs(total - 1) > 0.01) {
    const factor = 1 / total;
    needsPct *= factor;
    wantsPct *= factor;
    savingsPct *= factor;
  }

  // Round to 2 decimal places
  needsPct = Math.round(needsPct * 100) / 100;
  wantsPct = Math.round(wantsPct * 100) / 100;
  savingsPct = Math.round(savingsPct * 100) / 100;

  // Check if changes are significant (>1%)
  const significantChange =
    Math.abs(needsPct - cycle.needsPct) > 0.01 ||
    Math.abs(wantsPct - cycle.wantsPct) > 0.01 ||
    Math.abs(savingsPct - cycle.savingsPct) > 0.01;

  if (!significantChange || !reason) {
    return { shouldReallocate: false };
  }

  return {
    shouldReallocate: true,
    reason,
    changes: {
      needsPct,
      wantsPct,
      savingsPct,
    },
    details: {
      overspentBuckets,
      underspentBuckets,
    },
  };
}

/**
 * Calculate rollover amounts from last cycle
 */
export function calculateRollover(
  cycle: BudgetCycle,
  transactions: BudgetTransaction[],
  monthlyNetIncome: number
): { needs: number; wants: number; savings: number } {
  if (monthlyNetIncome <= 0) {
    return { needs: 0, wants: 0, savings: 0 };
  }

  // Calculate actual spending by bucket
  const spentByBucket: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };

  for (const tx of transactions.filter((t) => t.cycleId === cycle.id)) {
    spentByBucket[tx.bucket] += tx.amount;
  }

  // Calculate limits by bucket
  const limitsByBucket: Record<BudgetBucket, number> = {
    needs: monthlyNetIncome * cycle.needsPct,
    wants: monthlyNetIncome * cycle.wantsPct,
    savings: monthlyNetIncome * cycle.savingsPct,
  };

  // Calculate unspent amounts (only positive rollovers, no negative)
  const rollover = {
    needs: Math.max(0, limitsByBucket.needs - spentByBucket.needs),
    wants: Math.max(0, limitsByBucket.wants - spentByBucket.wants),
    savings: Math.max(0, limitsByBucket.savings - spentByBucket.savings),
  };

  return rollover;
}

/**
 * Format reallocation details for display
 */
export function formatReallocationDetails(
  suggestion: ReallocationSuggestion
): string {
  if (!suggestion.shouldReallocate || !suggestion.details) {
    return "";
  }

  const { overspentBuckets, underspentBuckets } = suggestion.details;

  let message = "";

  if (overspentBuckets.length > 0) {
    message += "Overspent: ";
    message += overspentBuckets
      .map((b) => `${b.bucket} by ${Math.round(b.percentage * 100)}%`)
      .join(", ");
  }

  if (underspentBuckets.length > 0) {
    if (message) message += "\n";
    message += "Underspent: ";
    message += underspentBuckets
      .map((b) => `${b.bucket} by ${Math.round(b.percentage * 100)}%`)
      .join(", ");
  }

  return message;
}

/**
 * Format allocation percentages for display
 */
export function formatAllocation(
  needsPct: number,
  wantsPct: number,
  savingsPct: number
): string {
  const needs = Math.round(needsPct * 100);
  const wants = Math.round(wantsPct * 100);
  const savings = Math.round(savingsPct * 100);
  return `${needs}/${wants}/${savings}`;
}
