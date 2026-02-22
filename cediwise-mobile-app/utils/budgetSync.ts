import type { BudgetMutation, BudgetMutationKind } from "../types/budget";
import {
  loadBudgetQueue,
  removeQueuedMutation,
  updateQueuedMutation,
} from "./budgetStorage";
import { supabase } from "./supabase";
import { isUuid } from "./uuid";

type AttemptResult = { ok: true } | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

async function attemptMutationRemote(
  kind: BudgetMutationKind,
  payload: Record<string, unknown>
): Promise<AttemptResult> {
  try {
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    if (kind === "upsert_profile") {
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "upsert_income_source") {
      if ("id" in payload && !isUuid(payload.id)) {
        return {
          ok: false,
          error:
            "Local data has a non-UUID id. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("income_sources")
        .upsert(payload, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "upsert_cycle") {
      if ("id" in payload && !isUuid(payload.id)) {
        return {
          ok: false,
          error:
            "Local data has a non-UUID id. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_cycles")
        .upsert(payload, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "upsert_category") {
      if ("id" in payload && !isUuid(payload.id)) {
        return {
          ok: false,
          error:
            "Local data has a non-UUID id. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_categories")
        .upsert(payload, { onConflict: "id" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "insert_transaction") {
      if ("id" in payload && !isUuid(payload.id)) {
        return {
          ok: false,
          error:
            "Local data has a non-UUID id. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_transactions")
        .insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_transaction") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return {
          ok: false,
          error:
            "Invalid id for update_transaction. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_transactions")
        .update({
          bucket: payload.bucket,
          category_id: payload.category_id,
          amount: payload.amount,
          note: payload.note,
          occurred_at: payload.occurred_at,
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "delete_transaction") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return {
          ok: false,
          error:
            "Invalid id for delete_transaction. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "delete_category") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return {
          ok: false,
          error:
            "Invalid id for delete_category. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "delete_income_source") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return {
          ok: false,
          error:
            "Invalid id for delete_income_source. Use Clear cache and recreate budget data.",
        };
      }
      const { error } = await supabase
        .from("income_sources")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "reset_budget") {
      const userId = payload.user_id;
      if (!isUuid(userId)) {
        return { ok: false, error: "Invalid user id for reset." };
      }

      // Delete in safe order (children first)
      const delTx = await supabase
        .from("budget_transactions")
        .delete()
        .eq("user_id", userId);
      if (delTx.error) return { ok: false, error: delTx.error.message };

      const delCats = await supabase
        .from("budget_categories")
        .delete()
        .eq("user_id", userId);
      if (delCats.error) return { ok: false, error: delCats.error.message };

      const delCycles = await supabase
        .from("budget_cycles")
        .delete()
        .eq("user_id", userId);
      if (delCycles.error) return { ok: false, error: delCycles.error.message };

      const delIncome = await supabase
        .from("income_sources")
        .delete()
        .eq("user_id", userId);
      if (delIncome.error) return { ok: false, error: delIncome.error.message };

      // Optional tables (may be unused in v1; safe to attempt)
      const delGoals = await supabase
        .from("savings_goals")
        .delete()
        .eq("user_id", userId);
      if (delGoals.error) return { ok: false, error: delGoals.error.message };

      const delUtils = await supabase
        .from("utility_logs")
        .delete()
        .eq("user_id", userId);
      if (delUtils.error) return { ok: false, error: delUtils.error.message };

      // New tables
      const delRecurring = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("user_id", userId);
      if (delRecurring.error)
        return { ok: false, error: delRecurring.error.message };

      const delDebts = await supabase
        .from("debts")
        .delete()
        .eq("user_id", userId);
      if (delDebts.error) return { ok: false, error: delDebts.error.message };

      const delPatterns = await supabase
        .from("spending_patterns")
        .delete()
        .eq("user_id", userId);
      if (delPatterns.error)
        return { ok: false, error: delPatterns.error.message };

      const delAdjustments = await supabase
        .from("budget_adjustments_log")
        .delete()
        .eq("user_id", userId);
      if (delAdjustments.error)
        return { ok: false, error: delAdjustments.error.message };

      // Clear budget prefs (if profile row exists)
      const updProfile = await supabase
        .from("profiles")
        .update({ payday_day: null })
        .eq("id", userId);
      if (updProfile.error)
        return { ok: false, error: updProfile.error.message };

      return { ok: true };
    }

    // Recurring Expenses
    if (kind === "insert_recurring_expense") {
      if ("id" in payload && !isUuid(payload.id)) {
        return { ok: false, error: "Invalid recurring expense id." };
      }
      const { error } = await supabase
        .from("recurring_expenses")
        .insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_recurring_expense") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid recurring expense id for update." };
      }
      const { id: _id, ...updates } = payload;
      const { error } = await supabase
        .from("recurring_expenses")
        .update(updates)
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "delete_recurring_expense") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid recurring expense id for delete." };
      }
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // Debts
    if (kind === "insert_debt") {
      if ("id" in payload && !isUuid(payload.id)) {
        return { ok: false, error: "Invalid debt id." };
      }
      const { error } = await supabase.from("debts").insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_debt") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid debt id for update." };
      }
      const { id: _id, ...updates } = payload;
      const { error } = await supabase
        .from("debts")
        .update(updates)
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "delete_debt") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid debt id for delete." };
      }
      const { error } = await supabase.from("debts").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "record_debt_payment") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid debt id for payment." };
      }
      const { error } = await supabase
        .from("debts")
        .update({
          remaining_amount: payload.remaining_amount,
          is_active: payload.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // Budget Adjustments
    if (kind === "log_budget_adjustment") {
      const { error } = await supabase
        .from("budget_adjustments_log")
        .insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // Category Management
    if (kind === "archive_category") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid category id for archive." };
      }
      const { error } = await supabase
        .from("budget_categories")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_category_limit") {
      const id = payload.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid category id for limit update." };
      }
      const { error } = await supabase
        .from("budget_categories")
        .update({
          limit_amount: payload.limit_amount,
          suggested_limit: payload.suggested_limit,
          manual_override: payload.manual_override ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // Reallocation & Templates
    if (kind === "apply_reallocation") {
      const cycleId = payload.cycle_id;
      if (!isUuid(cycleId)) {
        return { ok: false, error: "Invalid cycle id for reallocation." };
      }
      const { error } = await supabase
        .from("budget_cycles")
        .update({
          needs_pct: payload.needs_pct,
          wants_pct: payload.wants_pct,
          savings_pct: payload.savings_pct,
          reallocation_applied: true,
          reallocation_reason: payload.reallocation_reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cycleId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "apply_template") {
      const cycleId = payload.cycle_id;
      if (!isUuid(cycleId)) {
        return { ok: false, error: "Invalid cycle id for template." };
      }
      const { error } = await supabase
        .from("budget_cycles")
        .update({
          needs_pct: payload.needs_pct,
          wants_pct: payload.wants_pct,
          savings_pct: payload.savings_pct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cycleId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    return { ok: false, error: `Unsupported mutation kind: ${kind}` };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/**
 * Sync a cycle directly to Supabase (bypass queue). Use before enqueueing categories
 * that reference this cycle to avoid FK violations.
 */
export async function syncCycleDirect(
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  return attemptMutationRemote("upsert_cycle", payload);
}

export async function trySyncMutation(
  userId: string,
  mutation: BudgetMutation
): Promise<AttemptResult> {
  const now = new Date().toISOString();
  await updateQueuedMutation(userId, mutation.id, {
    lastAttemptAt: now,
    retryCount: mutation.retryCount + 1,
  });

  const result = await attemptMutationRemote(mutation.kind, mutation.payload);
  if (result.ok) {
    await removeQueuedMutation(userId, mutation.id);
    return result;
  }

  await updateQueuedMutation(userId, mutation.id, {
    lastError: result.error,
  });
  return result;
}

const MUTATION_DEPENDENCY_ORDER: Record<string, number> = {
  upsert_profile: 0,
  upsert_cycle: 1,
  upsert_category: 2,
  insert_transaction: 3,
  update_transaction: 4,
  delete_transaction: 5,
};

export async function flushBudgetQueue(
  userId: string,
  limit = 25
): Promise<{ okCount: number; failCount: number }> {
  const queue = await loadBudgetQueue(userId);
  const sorted = [...queue.items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const orderA = MUTATION_DEPENDENCY_ORDER[a.kind] ?? 99;
    const orderB = MUTATION_DEPENDENCY_ORDER[b.kind] ?? 99;
    return orderA - orderB;
  });
  const slice = sorted.slice(0, limit);

  let okCount = 0;
  let failCount = 0;

  for (const item of slice) {
    const result = await trySyncMutation(userId, item);
    if (result.ok) okCount += 1;
    else failCount += 1;
  }

  return { okCount, failCount };
}
