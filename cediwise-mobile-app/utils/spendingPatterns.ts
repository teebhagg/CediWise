import type {
  BudgetTransaction,
  SpendingPattern,
  SpendingTrend,
} from "@/types/budget";
import { log } from "./logger";
import { supabase } from "./supabase";

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

  // Get transactions for this category across all cycles
  const categoryTransactions = transactions.filter(
    (t) => t.categoryId === categoryId && cycleIds.includes(t.cycleId)
  );

  if (categoryTransactions.length === 0) return null;

  // Group by cycle and sum
  const spentByCycle: Record<string, number> = {};
  for (const tx of categoryTransactions) {
    spentByCycle[tx.cycleId] = (spentByCycle[tx.cycleId] || 0) + tx.amount;
  }

  const amounts = Object.values(spentByCycle);

  // Calculate average
  const avgSpent = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

  // Calculate variance (standard deviation)
  const variance = Math.sqrt(
    amounts.reduce((sum, amt) => sum + Math.pow(amt - avgSpent, 2), 0) /
      amounts.length
  );

  // Determine trend (simple linear regression or comparison of recent vs old)
  const trend = determineTrend(amounts);

  // Use most recent cycle as the reference
  const mostRecentCycleId = cycleIds[cycleIds.length - 1];

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
 * Determine spending trend from historical amounts
 */
function determineTrend(amounts: number[]): SpendingTrend {
  if (amounts.length < 2) return "stable";

  // Compare recent half to older half
  const midpoint = Math.floor(amounts.length / 2);
  const olderHalf = amounts.slice(0, midpoint);
  const recentHalf = amounts.slice(midpoint);

  const olderAvg =
    olderHalf.reduce((sum, amt) => sum + amt, 0) / olderHalf.length;
  const recentAvg =
    recentHalf.reduce((sum, amt) => sum + amt, 0) / recentHalf.length;

  const changeRatio = recentAvg / olderAvg;

  // 10% threshold
  if (changeRatio > 1.1) return "increasing";
  if (changeRatio < 0.9) return "decreasing";
  return "stable";
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
 * Get spending insights for the current cycle
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
};

export async function getSpendingInsights(
  userId: string,
  currentCycleId: string,
  categories: Array<{ id: string; name: string; limitAmount: number }>,
  transactions: BudgetTransaction[]
): Promise<SpendingInsight[]> {
  const insights: SpendingInsight[] = [];

  try {
    // Get patterns for all categories
    const { data: patterns, error } = await supabase
      .from("spending_patterns")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const patternsMap = new Map(
      (patterns || []).map((p) => [p.category_id, p])
    );

    for (const category of categories) {
      // Calculate spent in current cycle
      const spent = transactions
        .filter(
          (t) => t.categoryId === category.id && t.cycleId === currentCycleId
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const pattern = patternsMap.get(category.id);
      const avgSpent = pattern?.avg_spent || 0;
      const trend = (pattern?.trend as SpendingTrend) || "stable";

      // Determine status
      let status: SpendingInsight["status"] = "under";
      let suggestion: string | undefined;

      const utilization = spent / category.limitAmount;

      if (spent > category.limitAmount) {
        status = "over";
        suggestion =
          "You've exceeded your limit. Consider adjusting next cycle.";
      } else if (utilization > 0.85) {
        status = "near";
        suggestion = "You're close to your limit. Spend carefully.";
      } else if (utilization < 0.5 && spent < avgSpent * 0.7) {
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
      });
    }

    // Sort by status (over > near > under)
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
