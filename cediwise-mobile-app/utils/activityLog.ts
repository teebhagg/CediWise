import type {
  ActivityLogActionType,
  ActivityLogEntityType,
  UserActivityLogEntry,
} from "../types/budget";
import { log } from "./logger";
import { supabase } from "./supabase";

/**
 * Log a user activity with intended amount (never overwritten by recalculation).
 */
export async function logActivity(params: {
  userId: string;
  cycleId?: string | null;
  actionType: ActivityLogActionType;
  entityType: ActivityLogEntityType;
  entityId?: string | null;
  intendedAmount: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabase.from("user_activity_log").insert({
      user_id: params.userId,
      cycle_id: params.cycleId ?? null,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      intended_amount: Math.max(0, params.intendedAmount),
      metadata: params.metadata ?? {},
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error) {
    log.error("Failed to log activity:", error);
    // Don't throw - activity logging shouldn't break the app
  }
}

/**
 * Get recent activity for a user.
 */
export async function getActivityForUser(
  userId: string,
  limit: number = 50
): Promise<UserActivityLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      userId: String(row.user_id),
      cycleId: row.cycle_id != null ? String(row.cycle_id) : null,
      actionType: row.action_type as ActivityLogActionType,
      entityType: row.entity_type as ActivityLogEntityType,
      entityId: row.entity_id != null ? String(row.entity_id) : null,
      intendedAmount: Number(row.intended_amount) ?? 0,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));
  } catch (error) {
    log.error("Failed to get activity:", error);
    return [];
  }
}

/**
 * Get activity for a specific cycle.
 */
export async function getActivityForCycle(
  userId: string,
  cycleId: string
): Promise<UserActivityLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", userId)
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      userId: String(row.user_id),
      cycleId: row.cycle_id != null ? String(row.cycle_id) : null,
      actionType: row.action_type as ActivityLogActionType,
      entityType: row.entity_type as ActivityLogEntityType,
      entityId: row.entity_id != null ? String(row.entity_id) : null,
      intendedAmount: Number(row.intended_amount) ?? 0,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));
  } catch (error) {
    log.error("Failed to get cycle activity:", error);
    return [];
  }
}
