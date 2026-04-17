import { ANALYTICS_EVENTS } from "@/constants/analyticsEvents";
import { getPostHogOptional } from "@/utils/analytics/posthogClientRef";
import type { BudgetMutation, BudgetMutationKind } from "../types/budget";
import {
  loadBudgetQueue,
  removeQueuedMutation,
  updateQueuedMutation,
} from "./budgetStorage";
import { log } from "./logger";
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

/** PostgREST expects snake_case columns; camelCase keys cause schema-cache errors. */
function recurringExpensePayloadForDb(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const p = { ...payload };
  const bridges: [string, string][] = [
    ["userId", "user_id"],
    ["categoryId", "category_id"],
    ["startDate", "start_date"],
    ["endDate", "end_date"],
    ["isActive", "is_active"],
    ["autoAllocate", "auto_allocate"],
    ["createdAt", "created_at"],
    ["updatedAt", "updated_at"],
  ];
  for (const [camel, snake] of bridges) {
    if (camel in p && p[camel] !== undefined && p[snake] === undefined) {
      p[snake] = p[camel];
    }
    delete p[camel];
  }
  return p;
}

async function attemptMutationRemote(
  kind: BudgetMutationKind,
  payload: Record<string, unknown>
): Promise<AttemptResult> {
  try {
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    if (kind === "upsert_profile") {
      // budget_engine_mode is device-local only; strip if present in older queued payloads.
      const profilePayload = { ...(payload as Record<string, unknown>) };
      delete profilePayload.budget_engine_mode;
      const { error } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });
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
      const removeProfile = payload.remove_profile === true;
      if (!isUuid(userId)) {
        return { ok: false, error: "Invalid user id for reset." };
      }

      // Delete in safe order (children / FK references first)
      const delTx = await supabase
        .from("budget_transactions")
        .delete()
        .eq("user_id", userId);
      if (delTx.error) return { ok: false, error: delTx.error.message };

      // Tables referencing budget_cycles must be deleted BEFORE cycles
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

      const delCats = await supabase
        .from("budget_categories")
        .delete()
        .eq("user_id", userId);
      if (delCats.error) return { ok: false, error: delCats.error.message };

      // Safe to delete cycles now
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

      if (removeProfile) {
        const delProfile = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);
        if (delProfile.error)
          return { ok: false, error: delProfile.error.message };
      } else {
        // Clear budget prefs (if profile row exists)
        const updProfile = await supabase
          .from("profiles")
          .update({ payday_day: null })
          .eq("id", userId);
        if (updProfile.error)
          return { ok: false, error: updProfile.error.message };
      }

      return { ok: true };
    }

    // Recurring Expenses
    if (kind === "insert_recurring_expense") {
      const row = recurringExpensePayloadForDb(payload as Record<string, unknown>);
      if ("id" in row && !isUuid(row.id)) {
        return { ok: false, error: "Invalid recurring expense id." };
      }
      const { error } = await supabase
        .from("recurring_expenses")
        .insert(row);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_recurring_expense") {
      const row = recurringExpensePayloadForDb(payload as Record<string, unknown>);
      const id = row.id;
      if (!isUuid(id)) {
        return { ok: false, error: "Invalid recurring expense id for update." };
      }
      const { id: _id, ...updates } = row;
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

    if (kind === "insert_vault_deposit") {
      if ("id" in payload && !isUuid(payload.id)) {
        return { ok: false, error: "Invalid id for insert_vault_deposit." };
      }
      const row = {
        id: payload.id,
        user_id: payload.user_id,
        source: payload.source,
        amount: payload.amount,
        source_cycle_id: payload.source_cycle_id ?? null,
        note: payload.note ?? null,
        deposited_at: payload.deposited_at ?? new Date().toISOString(),
        created_at: payload.created_at ?? new Date().toISOString(),
      };
      const { error } = await supabase.from("vault_deposits").insert(row);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "update_vault_deposit") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return { ok: false, error: "Invalid id for update_vault_deposit." };
      }
      const { error } = await supabase
        .from("vault_deposits")
        .update({
          amount: payload.amount,
          note: payload.note ?? null,
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // ─── SME Ledger mutations (delegate to smeSync handlers) ────────
    if (
      kind === "sme_upsert_profile" ||
      kind === "sme_upsert_category" ||
      kind === "sme_delete_category" ||
      kind === "sme_insert_transaction" ||
      kind === "sme_update_transaction" ||
      kind === "sme_delete_transaction"
    ) {
      const { attemptSMEMutation } = await import("./smeSync");
      return attemptSMEMutation(kind, payload);
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

/**
 * Sync a profile mutation with retries. Use when online to ensure profile is
 * persisted before navigation (prevents setupCompleted conflicts on home/budget).
 */
export async function trySyncProfileWithRetries(
  userId: string,
  mutation: BudgetMutation,
  maxAttempts = 3,
  backoffMs = 1000
): Promise<AttemptResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await trySyncMutation(userId, mutation);
    if (result.ok) return result;
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, backoffMs));
    } else {
      return result;
    }
  }
  return { ok: false, error: "Sync failed after retries" };
}

const MUTATION_DEPENDENCY_ORDER: Record<string, number> = {
  upsert_profile: 0,
  upsert_cycle: 1,
  upsert_category: 2,
  insert_transaction: 3,
  update_transaction: 4,
  delete_transaction: 5,
  // After categories (FK) and alongside other budget rows; before SME block.
  insert_recurring_expense: 6,
  update_recurring_expense: 7,
  delete_recurring_expense: 8,
  insert_vault_deposit: 8,
  update_vault_deposit: 8,
  // SME mutations run after budget mutations
  sme_upsert_profile: 10,
  sme_upsert_category: 11,
  sme_insert_transaction: 12,
  sme_update_transaction: 13,
  sme_delete_transaction: 14,
  sme_delete_category: 15,
};

/** Processes one sync run (start→end). Caller must refresh queue only after this returns so UI updates only on run boundaries. */
export async function flushBudgetQueue(
  userId: string,
  limit = 25
): Promise<{ okCount: number; failCount: number }> {
  try {
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

    if (failCount > 0) {
      log.error("[budgetSync] flushBudgetQueue finished with failed mutations", {
        userId,
        okCount,
        failCount,
        attempted: slice.length,
      });
      getPostHogOptional()?.capture(ANALYTICS_EVENTS.budgetSyncFailed, {
        reason_bucket: "mutation_failed",
        fail_count: failCount,
        ok_count: okCount,
        attempted: slice.length,
      });
    }

    return { okCount, failCount };
  } catch (err) {
    log.error("[budgetSync] flushBudgetQueue threw", { userId, err });
    getPostHogOptional()?.capture(ANALYTICS_EVENTS.budgetSyncFailed, {
      reason_bucket: "sync_throw",
    });
    throw err;
  }
}

const FLUSH_UNTIL_MAX_ROUNDS = 80;
const FLUSH_UNTIL_SLICE = 50;

/**
 * Runs `flushBudgetQueue` in rounds until every listed mutation id is gone from the queue
 * (success) or any of them records `lastError` (failure). Use after enqueueing vault/profile
 * rows so callers know whether the server accepted the write.
 */
export async function flushBudgetQueueUntilMutationIdsCleared(
  userId: string,
  mutationIds: string[],
  options?: { maxRounds?: number; slice?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mutationIds.length === 0) return { ok: true };
  const maxRounds = options?.maxRounds ?? FLUSH_UNTIL_MAX_ROUNDS;
  const slice = options?.slice ?? FLUSH_UNTIL_SLICE;

  const pendingWithError = async (): Promise<string | null> => {
    const queue = await loadBudgetQueue(userId);
    for (const mid of mutationIds) {
      const item = queue.items.find((it) => it.id === mid);
      if (item?.lastError) return item.lastError;
    }
    return null;
  };

  for (let round = 0; round < maxRounds; round++) {
    const queue = await loadBudgetQueue(userId);
    const stillPending = mutationIds.filter((mid) =>
      queue.items.some((it) => it.id === mid),
    );
    if (stillPending.length === 0) return { ok: true };

    const errEarly = await pendingWithError();
    if (errEarly) return { ok: false, error: errEarly };

    await flushBudgetQueue(userId, slice);
  }

  const queue = await loadBudgetQueue(userId);
  const stillPending = mutationIds.filter((mid) =>
    queue.items.some((it) => it.id === mid),
  );
  if (stillPending.length === 0) return { ok: true };

  const errMsg = await pendingWithError();
  if (errMsg) return { ok: false, error: errMsg };

  return {
    ok: false,
    error:
      "Could not sync yet. Check your connection and try again.",
  };
}

/**
 * Delete all budget-related data from the server (and optionally profile prefs).
 * Does not use the queue; performs deletes directly. Caller should clear local
 * state and queue after this succeeds.
 */
export async function deleteAllBudgetDataFromServer(
  userId: string,
  options: { removeProfile: boolean }
): Promise<AttemptResult> {
  if (!isUuid(userId)) {
    return { ok: false, error: "Invalid user id." };
  }
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  try {
    const delTx = await supabase
      .from("budget_transactions")
      .delete()
      .eq("user_id", userId);
    if (delTx.error) return { ok: false, error: delTx.error.message };

    // Tables referencing budget_cycles must be deleted BEFORE cycles
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

    const delCats = await supabase
      .from("budget_categories")
      .delete()
      .eq("user_id", userId);
    if (delCats.error) return { ok: false, error: delCats.error.message };

    // Safe to delete cycles now
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

    const delRecurring = await supabase
      .from("recurring_expenses")
      .delete()
      .eq("user_id", userId);
    if (delRecurring.error)
      return { ok: false, error: delRecurring.error.message };

    if (options.removeProfile) {
      const delProfile = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (delProfile.error)
        return { ok: false, error: delProfile.error.message };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
