/**
 * SME Ledger Zustand Store
 * Follows the same pattern as debtStore.ts
 * Uses the separate SME queue (smeStorage.ts + smeSync.ts) instead of budget queue.
 */

import type {
  BusinessType,
  PaymentMethod,
  SMECategory,
  SMEProfile,
  SMETransaction,
  TransactionType,
} from "@/types/sme";
import { calculateVAT } from "@/utils/vatEngine";
import {
  enqueueSMEMutation,
  loadSMEState,
  makeQueueId,
  saveSMEState,
  createEmptySMEState,
} from "@/utils/smeStorage";
import { trySyncSMEMutation } from "@/utils/smeSync";
import { log } from "@/utils/logger";
import { uuidv4 } from "@/utils/uuid";
import { create } from "zustand";

// ─── Params ─────────────────────────────────────────

export type SetupSMEParams = {
  businessName: string;
  businessType: BusinessType;
  businessCategory?: string | null;
  tin?: string | null;
  vatRegistered?: boolean;
};

export type AddTransactionParams = {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  transactionDate: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod | null;
  vatApplicable?: boolean;
  notes?: string | null;
};

export type UpdateTransactionParams = {
  type?: TransactionType;
  amount?: number;
  description?: string;
  category?: string;
  transactionDate?: string;
  paymentMethod?: PaymentMethod | null;
  vatApplicable?: boolean;
  notes?: string | null;
};

export type AddCategoryParams = {
  name: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
};

// ─── Store Shape ─────────────────────────────────────

export type SMELedgerStoreState = {
  userId: string | null;
  profile: SMEProfile | null;
  transactions: SMETransaction[];
  categories: SMECategory[];
  isLoading: boolean;
  error: string | null;
};

export type SMELedgerStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  loadState: () => Promise<void>;
  setupBusiness: (params: SetupSMEParams) => Promise<void>;
  addTransaction: (params: AddTransactionParams) => Promise<void>;
  updateTransaction: (id: string, params: UpdateTransactionParams) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (params: AddCategoryParams) => Promise<void>;
  addCategories: (categories: AddCategoryParams[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearLocal: () => Promise<void>;
};

export type SMELedgerStore = SMELedgerStoreState & SMELedgerStoreActions;

// ─── Helpers ─────────────────────────────────────────

function toSMEProfileRow(profile: SMEProfile): Record<string, unknown> {
  return {
    id: profile.id,
    user_id: profile.userId,
    business_name: profile.businessName,
    business_type: profile.businessType,
    business_category: profile.businessCategory,
    currency: profile.currency,
    vat_registered: profile.vatRegistered,
    tin: profile.tin,
    fiscal_year_start_month: profile.fiscalYearStartMonth,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function toSMETransactionRow(tx: SMETransaction): Record<string, unknown> {
  return {
    id: tx.id,
    user_id: tx.userId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    transaction_date: tx.transactionDate,
    payment_method: tx.paymentMethod,
    vat_applicable: tx.vatApplicable,
    vat_amount: tx.vatAmount,
    notes: tx.notes,
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
  };
}

function toSMECategoryRow(cat: SMECategory): Record<string, unknown> {
  return {
    id: cat.id,
    user_id: cat.userId,
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
    color: cat.color,
    is_default: cat.isDefault,
    created_at: cat.createdAt,
    updated_at: cat.updatedAt,
  };
}

// ─── Store ───────────────────────────────────────────

export const useSMELedgerStore = create<SMELedgerStore>((set, get) => ({
  userId: null,
  profile: null,
  transactions: [],
  categories: [],
  isLoading: true,
  error: null,

  initForUser: async (userId: string | null) => {
    set({ userId, isLoading: true });
    if (!userId) {
      set({ profile: null, transactions: [], categories: [], isLoading: false });
      return;
    }
    await get().loadState();
  },

  loadState: async () => {
    const { userId } = get();
    if (!userId) {
      set({ profile: null, transactions: [], categories: [], isLoading: false });
      return;
    }

    const startUserId = userId;
    set({ isLoading: true, error: null });

    try {
      const state = await loadSMEState(startUserId);
      if (get().userId !== startUserId) return;

      set({
        profile: state.profile,
        transactions: state.transactions,
        categories: state.categories,
        isLoading: false,
      });
    } catch (err) {
      if (get().userId !== startUserId) return;
      log.error("Failed to load SME state:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load SME data",
        isLoading: false,
      });
    }
  },

  setupBusiness: async (params) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const id = uuidv4();
    const now = new Date().toISOString();

    const profile: SMEProfile = {
      id,
      userId,
      businessName: params.businessName,
      businessType: params.businessType,
      businessCategory: params.businessCategory ?? null,
      currency: "GHS",
      vatRegistered: params.vatRegistered ?? false,
      tin: params.tin ?? null,
      fiscalYearStartMonth: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    set({ profile });

    const state = await loadSMEState(userId);
    state.profile = profile;
    await saveSMEState(state);

    // Enqueue + sync
    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: now,
      kind: "sme_upsert_profile",
      payload: toSMEProfileRow(profile),
    });

    await trySyncSMEMutation(userId, mutation);
  },

  addTransaction: async (params) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const id = uuidv4();
    const now = new Date().toISOString();
    const vatAmount = calculateVAT(params.amount, params.vatApplicable ?? true);

    const tx: SMETransaction = {
      id,
      userId,
      type: params.type,
      amount: params.amount,
      description: params.description,
      category: params.category,
      transactionDate: params.transactionDate,
      paymentMethod: params.paymentMethod ?? null,
      vatApplicable: params.vatApplicable ?? true,
      vatAmount,
      notes: params.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    const nextTxs = [tx, ...get().transactions];
    set({ transactions: nextTxs });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: nextTxs,
      categories: get().categories,
      updatedAt: new Date().toISOString(),
    });

    // Enqueue + sync
    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: now,
      kind: "sme_insert_transaction",
      payload: toSMETransactionRow(tx),
    });

    await trySyncSMEMutation(userId, mutation);
  },

  updateTransaction: async (id, params) => {
    const { userId, transactions } = get();
    if (!userId) throw new Error("User not authenticated");

    const existing = transactions.find((t) => t.id === id);
    if (!existing) throw new Error("Transaction not found");

    const now = new Date().toISOString();
    const updated: SMETransaction = {
      ...existing,
      ...params,
      vatAmount: params.amount !== undefined || params.vatApplicable !== undefined
        ? calculateVAT(params.amount ?? existing.amount, params.vatApplicable ?? existing.vatApplicable)
        : existing.vatAmount,
      updatedAt: now,
    };

    const nextTxs = get().transactions.map((t) => (t.id === id ? updated : t));
    set({ transactions: nextTxs });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: nextTxs,
      categories: get().categories,
      updatedAt: new Date().toISOString(),
    });

    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: now,
      kind: "sme_update_transaction",
      payload: toSMETransactionRow(updated),
    });

    await trySyncSMEMutation(userId, mutation);
  },

  deleteTransaction: async (id) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const nextTxs = get().transactions.filter((t) => t.id !== id);
    set({ transactions: nextTxs });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: nextTxs,
      categories: get().categories,
      updatedAt: new Date().toISOString(),
    });

    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "sme_delete_transaction",
      payload: { id, user_id: userId },
    });

    await trySyncSMEMutation(userId, mutation);
  },

  addCategory: async (params) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const id = uuidv4();
    const now = new Date().toISOString();

    const cat: SMECategory = {
      id,
      userId,
      name: params.name,
      type: params.type,
      icon: params.icon ?? null,
      color: params.color ?? null,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    const nextCats = [...get().categories, cat];
    set({ categories: nextCats });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: get().transactions,
      categories: nextCats,
      updatedAt: new Date().toISOString(),
    });

    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: now,
      kind: "sme_upsert_category",
      payload: toSMECategoryRow(cat),
    });

    await trySyncSMEMutation(userId, mutation);
  },

  addCategories: async (categories) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const now = new Date().toISOString();
    const newCats: SMECategory[] = categories.map((params) => ({
      id: uuidv4(),
      userId,
      name: params.name,
      type: params.type,
      icon: params.icon ?? null,
      color: params.color ?? null,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }));

    const nextAllCats = [...get().categories, ...newCats];
    set({ categories: nextAllCats });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: get().transactions,
      categories: nextAllCats,
      updatedAt: new Date().toISOString(),
    });

    for (const cat of newCats) {
      const mutation = await enqueueSMEMutation(userId, {
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "sme_upsert_category",
        payload: toSMECategoryRow(cat),
      });
      // Fire and forget sync so it doesn't block UI for 14 sequential network requests
      trySyncSMEMutation(userId, mutation).catch(() => {});
    }
  },

  deleteCategory: async (id) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const nextCats = get().categories.filter((c) => c.id !== id);
    set({ categories: nextCats });
    await saveSMEState({
      version: 1,
      userId,
      profile: get().profile,
      transactions: get().transactions,
      categories: nextCats,
      updatedAt: new Date().toISOString(),
    });

    const mutation = await enqueueSMEMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "sme_delete_category",
      payload: { id, user_id: userId },
    });

    await trySyncSMEMutation(userId, mutation);
  },

  clearLocal: async () => {
    const { userId } = get();
    if (userId) {
      const { clearSMEState } = await import("@/utils/smeStorage");
      await clearSMEState(userId);
    }
    set({ userId: null, profile: null, transactions: [], categories: [], error: null });
  },
}));
