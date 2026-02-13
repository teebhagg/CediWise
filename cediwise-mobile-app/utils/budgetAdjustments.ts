import type { BudgetAdjustment, BudgetAdjustmentType } from "@/types/budget";
import { log } from "./logger";
import { supabase } from "./supabase";

/**
 * Log a budget adjustment to the database
 */
export async function logBudgetAdjustment(params: {
  userId: string;
  cycleId?: string | null;
  adjustmentType: BudgetAdjustmentType;
  changes: Record<string, unknown>;
  reason?: string | null;
}): Promise<void> {
  try {
    const { error } = await supabase.from("budget_adjustments_log").insert({
      user_id: params.userId,
      cycle_id: params.cycleId,
      adjustment_type: params.adjustmentType,
      changes: params.changes,
      reason: params.reason,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    log.error("Failed to log budget adjustment:", error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Get recent budget adjustments for a user
 */
export async function getRecentAdjustments(
  userId: string,
  limit: number = 10
): Promise<BudgetAdjustment[]> {
  try {
    const { data, error } = await supabase
      .from("budget_adjustments_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      cycleId: row.cycle_id,
      adjustmentType: row.adjustment_type as BudgetAdjustmentType,
      changes: row.changes,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error("Failed to get recent adjustments:", error);
    return [];
  }
}

/**
 * Get adjustments for a specific cycle
 */
export async function getCycleAdjustments(
  userId: string,
  cycleId: string
): Promise<BudgetAdjustment[]> {
  try {
    const { data, error } = await supabase
      .from("budget_adjustments_log")
      .select("*")
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      cycleId: row.cycle_id,
      adjustmentType: row.adjustment_type as BudgetAdjustmentType,
      changes: row.changes,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  } catch (error) {
    log.error("Failed to get cycle adjustments:", error);
    return [];
  }
}

/**
 * Format adjustment type for display
 */
export function formatAdjustmentType(type: BudgetAdjustmentType): string {
  const labels: Record<BudgetAdjustmentType, string> = {
    vitals_change: "Vitals Updated",
    manual: "Manual Adjustment",
    auto_reallocation: "Auto Reallocation",
    template_applied: "Template Applied",
    rollover: "Budget Rollover",
    income_change: "Income Changed",
    category_change: "Category Updated",
  };
  return labels[type] || type;
}

/**
 * Format adjustment changes for display
 */
export function formatAdjustmentChanges(
  changes: Record<string, unknown>
): string {
  try {
    if (changes.from && changes.to) {
      // Show before/after comparison
      const from = changes.from as Record<string, unknown>;
      const to = changes.to as Record<string, unknown>;

      const changedFields = Object.keys(to).filter(
        (key) => JSON.stringify(from[key]) !== JSON.stringify(to[key])
      );

      return changedFields
        .map(
          (field) =>
            `${field}: ${JSON.stringify(from[field])} → ${JSON.stringify(
              to[field]
            )}`
        )
        .join("\n");
    }

    // Generic display
    return JSON.stringify(changes, null, 2);
  } catch (error) {
    return "Unable to format changes";
  }
}

/**
 * Get adjustment summary stats
 */
export type AdjustmentStats = {
  totalAdjustments: number;
  byType: Record<BudgetAdjustmentType, number>;
  recentActivity: boolean; // true if adjusted in last 7 days
};

export async function getAdjustmentStats(
  userId: string
): Promise<AdjustmentStats> {
  try {
    const { data, error } = await supabase
      .from("budget_adjustments_log")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const adjustments = data || [];
    const totalAdjustments = adjustments.length;

    const byType: Record<BudgetAdjustmentType, number> = {
      vitals_change: 0,
      manual: 0,
      auto_reallocation: 0,
      template_applied: 0,
      rollover: 0,
      income_change: 0,
      category_change: 0,
    };

    let recentActivity = false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const adj of adjustments) {
      const type = adj.adjustment_type as BudgetAdjustmentType;
      byType[type] = (byType[type] || 0) + 1;

      if (new Date(adj.created_at) > sevenDaysAgo) {
        recentActivity = true;
      }
    }

    return {
      totalAdjustments,
      byType,
      recentActivity,
    };
  } catch (error) {
    log.error("Failed to get adjustment stats:", error);
    return {
      totalAdjustments: 0,
      byType: {
        vitals_change: 0,
        manual: 0,
        auto_reallocation: 0,
        template_applied: 0,
        rollover: 0,
        income_change: 0,
        category_change: 0,
      },
      recentActivity: false,
    };
  }
}
