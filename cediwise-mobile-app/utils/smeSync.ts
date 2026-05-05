/**
 * SME Ledger Sync Engine
 * Maps SME mutation kinds to Supabase calls.
 * Reuses BudgetMutation / BudgetQueue types from the existing queue system.
 */

import type { BudgetMutation, BudgetMutationKind } from "../types/budget";
import {
  loadSMEQueue,
  removeSMEQueuedMutation,
  updateSMEQueuedMutation,
  saveSMEState,
  loadSMEState,
  createEmptySMEState,
} from "./smeStorage";
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

export async function attemptSMEMutation(
  kind: BudgetMutationKind,
  payload: Record<string, unknown>
): Promise<AttemptResult> {
  try {
    if (!supabase) return { ok: false, error: "Supabase not configured" };

    // ─── SME Profile ──────────────────────────────
    if (kind === "sme_upsert_profile") {
      if (!isUuid(payload.user_id)) {
        return { ok: false, error: "Invalid user_id for SME profile." };
      }
      const { error } = await supabase
        .from("sme_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // ─── SME Category ─────────────────────────────
    if (kind === "sme_upsert_category") {
      if ("id" in payload && !isUuid(payload.id)) {
        return { ok: false, error: "Invalid SME category id." };
      }
      const { error } = await supabase
        .from("sme_categories")
        .upsert(payload, { onConflict: "user_id,name,type" });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "sme_delete_category") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return { ok: false, error: "Invalid SME category id for delete." };
      }
      const { error } = await supabase
        .from("sme_categories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    // ─── SME Transaction ──────────────────────────
    if (kind === "sme_insert_transaction") {
      if ("id" in payload && !isUuid(payload.id)) {
        return { ok: false, error: "Invalid SME transaction id." };
      }
      const { error } = await supabase
        .from("sme_transactions")
        .insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "sme_update_transaction") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return { ok: false, error: "Invalid SME transaction id for update." };
      }
      const { error } = await supabase
        .from("sme_transactions")
        .update({
          type: payload.type,
          amount: payload.amount,
          description: payload.description,
          category: payload.category,
          transaction_date: payload.transaction_date,
          payment_method: payload.payment_method,
          vat_applicable: payload.vat_applicable,
          vat_amount: payload.vat_amount,
          notes: payload.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (kind === "sme_delete_transaction") {
      const id = payload.id;
      const userId = payload.user_id;
      if (!isUuid(id) || !isUuid(userId)) {
        return { ok: false, error: "Invalid SME transaction id for delete." };
      }
      const { error } = await supabase
        .from("sme_transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    return { ok: false, error: `Unsupported SME mutation kind: ${kind}` };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function trySyncSMEMutation(
  userId: string,
  mutation: BudgetMutation
): Promise<AttemptResult> {
  const now = new Date().toISOString();
  await updateSMEQueuedMutation(userId, mutation.id, {
    lastAttemptAt: now,
    retryCount: mutation.retryCount + 1,
  });

  const result = await attemptSMEMutation(mutation.kind, mutation.payload);
  if (result.ok) {
    await removeSMEQueuedMutation(userId, mutation.id);
    return result;
  }

  await updateSMEQueuedMutation(userId, mutation.id, {
    lastError: result.error,
  });
  return result;
}

const SME_MUTATION_DEPENDENCY_ORDER: Record<string, number> = {
  sme_upsert_profile: 0,
  sme_upsert_category: 1,
  sme_insert_transaction: 2,
  sme_update_transaction: 3,
  sme_delete_transaction: 4,
  sme_delete_category: 5,
};

export async function flushSMEQueue(
  userId: string,
  limit = 25
): Promise<{ okCount: number; failCount: number }> {
  const queue = await loadSMEQueue(userId);
  const sorted = [...queue.items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const orderA = SME_MUTATION_DEPENDENCY_ORDER[a.kind] ?? 99;
    const orderB = SME_MUTATION_DEPENDENCY_ORDER[b.kind] ?? 99;
    return orderA - orderB;
  });
  const slice = sorted.slice(0, limit);

  let okCount = 0;
  let failCount = 0;

  for (const item of slice) {
    const result = await trySyncSMEMutation(userId, item);
    if (result.ok) okCount += 1;
    else failCount += 1;
  }

  return { okCount, failCount };
}

/**
 * Hydrate SME state from Supabase (remote → local).
 * Skips if there are pending local mutations (unless force: true).
 */
export async function hydrateSMEFromRemote(
  userId: string,
  options?: { force?: boolean }
): Promise<void> {
  if (!supabase) return;

  const queue = await loadSMEQueue(userId);
  // Important: We still fetch the profile even if there are pending mutations.
  // This ensures the user sees their Business Identity (Name/Category) even if
  // transactions are still syncing. We only skip hydration of transactions/categories
  // if the queue is not empty (and force is false).
  const hasPending = queue.items.length > 0;

  // Fetch profile
  const { data: profileRow, error: profileErr } = await supabase
    .from("sme_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (profileErr && profileErr.code !== "PGRST116") {
    throw new Error(profileErr.message);
  }

  // Fetch categories
  const { data: categoryRows, error: catErr } = await supabase
    .from("sme_categories")
    .select("*")
    .eq("user_id", userId);

  if (catErr) throw new Error(catErr.message);

  // Fetch transactions (last 500, ordered by date desc)
  const { data: transactionRows, error: txErr } = await supabase
    .from("sme_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .limit(500);

  if (txErr) throw new Error(txErr.message);

  // Skip deep hydration of transactions/categories if we have local unsynced edits
  if (hasPending && !options?.force) {
     // If we have a profile but no local state, we should still save the profile
     if (profileRow) {
        const currentState = await loadSMEState(userId);
        currentState.profile = {
          id: profileRow.id,
          userId: profileRow.user_id,
          businessName: profileRow.business_name,
          businessType: profileRow.business_type,
          businessCategory: profileRow.business_category,
          currency: profileRow.currency,
          vatRegistered: profileRow.vat_registered,
          tin: profileRow.tin,
          fiscalYearStartMonth: profileRow.fiscal_year_start_month,
          createdAt: profileRow.created_at,
          updatedAt: profileRow.updated_at,
        };
        await saveSMEState(currentState);
     }
     return;
  }

  const preserved = await loadSMEState(userId);
  const state = createEmptySMEState(userId);
  state.draftBatchTransactions = preserved.draftBatchTransactions;
  state.lastUsedType = preserved.lastUsedType;
  state.lastUsedCategory = preserved.lastUsedCategory;
  state.lastUsedPaymentMethod = preserved.lastUsedPaymentMethod;

  if (profileRow) {
    state.profile = {
      id: profileRow.id,
      userId: profileRow.user_id,
      businessName: profileRow.business_name,
      businessType: profileRow.business_type,
      businessCategory: profileRow.business_category,
      currency: profileRow.currency,
      vatRegistered: profileRow.vat_registered,
      tin: profileRow.tin,
      fiscalYearStartMonth: profileRow.fiscal_year_start_month,
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    };
  }

  if (categoryRows) {
    state.categories = categoryRows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      type: r.type,
      icon: r.icon,
      color: r.color,
      isDefault: r.is_default,
      createdAt: r.created_at,
      updatedAt: r.updated_at ?? r.created_at,
    }));
  }

  if (transactionRows) {
    state.transactions = transactionRows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      category: r.category,
      transactionDate: r.transaction_date,
      paymentMethod: r.payment_method,
      vatApplicable: r.vat_applicable,
      vatAmount: Number(r.vat_amount),
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  await saveSMEState(state);
}

const FLUSH_UNTIL_MAX_ROUNDS = 80;
const FLUSH_UNTIL_SLICE = 50;

/**
 * Runs `flushSMEQueue` in rounds until every listed mutation id is gone from the queue
 * (success) or any of them records `lastError` (failure).
 */
export async function flushSMEQueueUntilMutationIdsCleared(
  userId: string,
  mutationIds: string[],
  options?: { maxRounds?: number; slice?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mutationIds.length === 0) return { ok: true };
  const maxRounds = options?.maxRounds ?? FLUSH_UNTIL_MAX_ROUNDS;
  const slice = options?.slice ?? FLUSH_UNTIL_SLICE;

  const pendingWithError = async (): Promise<string | null> => {
    const queue = await loadSMEQueue(userId);
    for (const mid of mutationIds) {
      const item = queue.items.find((it) => it.id === mid);
      if (item?.lastError) return item.lastError;
    }
    return null;
  };

  for (let round = 0; round < maxRounds; round++) {
    const queue = await loadSMEQueue(userId);
    const stillPending = mutationIds.filter((mid) =>
      queue.items.some((it) => it.id === mid),
    );
    if (stillPending.length === 0) return { ok: true };

    const errEarly = await pendingWithError();
    if (errEarly) return { ok: false, error: errEarly };

    await flushSMEQueue(userId, slice);
  }

  const queue = await loadSMEQueue(userId);
  const stillPending = mutationIds.filter((mid) =>
    queue.items.some((it) => it.id === mid),
  );
  if (stillPending.length === 0) return { ok: true };

  const errMsg = await pendingWithError();
  if (errMsg) return { ok: false, error: errMsg };

  return {
    ok: false,
    error: "Could not sync yet. Check your connection and try again.",
  };
}

