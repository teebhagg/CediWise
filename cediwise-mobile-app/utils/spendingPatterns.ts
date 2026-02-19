import type {
  BudgetTransaction,
  SpendingPattern,
  SpendingTrend,
} from "@/types/budget";
import { log } from "./logger";
import {
  computeConfidence,
  determineTrend,
  shouldSuggestUnderspend,
} from "./spendingPatternsLogic";
import { supabase } from "./supabase";

export { computeConfidence, determineTrend, shouldSuggestUnderspend };

/**
 * Calculate spending patterns for a category across multiple cycles
 */
export async function calculateSpendingPatternForCategory(
  userId: string,
  categoryId: string,
  cycleIds: string[],
  transactions: BudgetTransaction[]
): Promise<Omit<SpendingPattern, "id" | "createdAt" | "updatedAt"> | null> {
  if (cycleIds.length === 0) return null;

  const categoryTransactions = transactions.filter(
    (t) => t.categoryId === categoryId && cycleIds.includes(t.cycleId)
  );

  if (categoryTransactions.length === 0) return null;

  const spentByCycle: Record<string, number> = {};
  for (const tx of categoryTransactions) {
    spentByCycle[tx.cycleId] = (spentByCycle[tx.cycleId] || 0) + tx.amount;
  }

  // Preserve chronological order (oldest first) for trend calculation
  const chronologicalIds =
    cycleIds.length > 0 && cycleIds.length <= 6
      ? [...cycleIds].reverse()
      : cycleIds.slice(-6).reverse();
  const amounts = chronologicalIds
    .map((cid) => spentByCycle[cid] ?? 0)
    .filter((a) => a >= 0);

  const n = amounts.length;
  const avgSpent = n > 0 ? amounts.reduce((sum, amt) => sum + amt, 0) / n : 0;

  const variance =
    n > 1
      ? Math.sqrt(
          amounts.reduce((sum, amt) => sum + Math.pow(amt - avgSpent, 2), 0) / n
        )
      : 0;

  const trend = determineTrend(amounts, variance, avgSpent);

  const mostRecentCycleId = cycleIds[0] ?? cycleIds[cycleIds.length - 1];

  return {
    userId,
    categoryId,
    cycleId: mostRecentCycleId,
    avgSpent,
    trend,
    variance,
    lastCalculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate all spending patterns for a user
 */
export async function calculateAllSpendingPatterns(
  userId: string
): Promise<void> {
  try {
    // Get last 6 cycles
    const { data: cycles, error: cyclesError } = await supabase
      .from("budget_cycles")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false })
      .limit(6);

    if (cyclesError) throw cyclesError;
    if (!cycles || cycles.length === 0) return;

    const cycleIds = cycles.map((c) => c.id);

    // Get all transactions for these cycles
    const { data: transactions, error: txError } = await supabase
      .from("budget_transactions")
      .select("*")
      .eq("user_id", userId)
      .in("cycle_id", cycleIds);

    if (txError) throw txError;

    // Get all categories from the most recent cycle
    const mostRecentCycleId = cycles[0].id;
    const { data: categories, error: catError } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", userId)
      .eq("cycle_id", mostRecentCycleId);

    if (catError) throw catError;
    if (!categories) return;

    // Calculate patterns for each category
    const patterns: Array<
      Omit<SpendingPattern, "id" | "createdAt" | "updatedAt">
    > = [];

    for (const category of categories) {
      const pattern = await calculateSpendingPatternForCategory(
        userId,
        category.id,
        cycleIds,
        transactions || []
      );

      if (pattern) {
        patterns.push(pattern);
      }
    }

    // Upsert patterns to database
    if (patterns.length > 0) {
      const { error: upsertError } = await supabase
        .from("spending_patterns")
        .upsert(
          patterns.map((p) => ({
            user_id: p.userId,
            category_id: p.categoryId,
            cycle_id: p.cycleId,
            avg_spent: p.avgSpent,
            trend: p.trend,
            variance: p.variance,
            last_calculated_at: p.lastCalculatedAt,
          })),
          {
            onConflict: "category_id,cycle_id",
          }
        );

      if (upsertError) throw upsertError;
    }
  } catch (error) {
    log.error("Failed to calculate spending patterns:", error);
    throw error;
  }
}

/**
 * Get suggested limit for a category based on spending patterns
 */
export async function getSuggestedCategoryLimit(
  userId: string,
  categoryId: string
): Promise<number | null> {
  try {
    const { data: pattern, error } = await supabase
      .from("spending_patterns")
      .select("*")
      .eq("user_id", userId)
      .eq("category_id", categoryId)
      .order("last_calculated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !pattern) return null;

    // Suggested limit = average + 10% buffer
    const suggestedLimit = pattern.avg_spent * 1.1;

    return Math.round(suggestedLimit * 100) / 100; // Round to 2 decimals
  } catch (error) {
    log.error("Failed to get suggested limit:", error);
    return null;
  }
}

/**
 * Get spending insights for the current cycle (Phase 1.1: variance & confidence)
 */
export type SpendingInsight = {
  categoryId: string;
  categoryName: string;
  spent: number;
  limit: number;
  avgSpent: number;
  trend: SpendingTrend;
  status: "over" | "near" | "under";
  suggestion?: string;
  /** Standard deviation of spending across cycles */
  variance?: number;
  /** 0–1 reliability of pattern for recommendations */
  confidence?: number;
};

export async function getSpendingInsights(
  userId: string,
  currentCycleId: string,
  categories: { id: string; name: string; limitAmount: number }[],
  transactions: BudgetTransaction[]
): Promise<SpendingInsight[]> {
  const insights: SpendingInsight[] = [];

  try {
    const { data: patterns, error } = await supabase
      .from("spending_patterns")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const patternsMap = new Map(
      (patterns || []).map((p) => [p.category_id, p])
    );

    for (const category of categories) {
      const spent = transactions
        .filter(
          (t) => t.categoryId === category.id && t.cycleId === currentCycleId
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const pattern = patternsMap.get(category.id);
      const avgSpent = pattern?.avg_spent ?? 0;
      const variance = pattern?.variance ?? 0;
      const trend = (pattern?.trend as SpendingTrend) || "stable";

      const confidence = computeConfidence(
        pattern && avgSpent > 0 ? 3 : 0,
        variance,
        avgSpent,
        pattern?.last_calculated_at
      );

      let status: SpendingInsight["status"] = "under";
      let suggestion: string | undefined;

      const utilization =
        category.limitAmount > 0 ? spent / category.limitAmount : 0;

      if (spent > category.limitAmount) {
        status = "over";
        suggestion =
          "You've exceeded your limit. Consider adjusting next cycle.";
      } else if (utilization > 0.85) {
        status = "near";
        suggestion = "You're close to your limit. Spend carefully.";
      } else if (
        utilization < 0.5 &&
        shouldSuggestUnderspend(spent, avgSpent, variance, category.limitAmount)
      ) {
        status = "under";
        suggestion =
          "You're spending less than usual. Consider reducing this category's limit.";
      }

      insights.push({
        categoryId: category.id,
        categoryName: category.name,
        spent,
        limit: category.limitAmount,
        avgSpent,
        trend,
        status,
        suggestion,
        variance,
        confidence,
      });
    }

    insights.sort((a, b) => {
      const order = { over: 0, near: 1, under: 2 };
      return order[a.status] - order[b.status];
    });

    return insights;
  } catch (error) {
    log.error("Failed to get spending insights:", error);
    return [];
  }
}
