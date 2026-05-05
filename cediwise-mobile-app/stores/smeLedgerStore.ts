/**
 * SME Ledger Zustand Store
 * Follows the same pattern as debtStore.ts
 * Uses the separate SME queue (smeStorage.ts + smeSync.ts) instead of budget queue.
 */

import type { BudgetMutation } from "@/types/budget";
import type {
  BusinessType,
  DraftSMETransaction,
  PaymentMethod,
  SMECategory,
  SMEProfile,
  SMEState,
  SMETransaction,
  TransactionType,
} from "@/types/sme";
import { log } from "@/utils/logger";
import {
  enqueueSMEMutation,
  loadSMEState,
  makeQueueId,
  saveSMEState,
} from "@/utils/smeStorage";
import { trySyncSMEMutation } from "@/utils/smeSync";
import { uuidv4 } from "@/utils/uuid";
import { calculateVAT } from "@/utils/vatEngine";
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
  draftBatchTransactions: DraftSMETransaction[];
  lastUsedType: TransactionType | null;
  lastUsedCategory: string | null;
  lastUsedPaymentMethod: PaymentMethod | null;
};

export type SMELedgerStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  loadState: () => Promise<void>;
  setupBusiness: (params: SetupSMEParams) => Promise<void>;
  addTransaction: (
    params: AddTransactionParams,
  ) => Promise<{ mutationId: string }>;
  addTransactionLocal: (
    params: AddTransactionParams,
  ) => Promise<{ mutationId: string; mutation: BudgetMutation }>;
  updateTransaction: (
    id: string,
    params: UpdateTransactionParams,
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (params: AddCategoryParams) => Promise<void>;
  addCategories: (categories: AddCategoryParams[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  clearLocal: () => Promise<void>;
  addToDraftBatch: (draft: Omit<DraftSMETransaction, "tempId">) => void;
  removeFromDraftBatch: (tempId: string) => void;
  clearDraftBatch: () => void;
  getDraftBatchTransactions: () => DraftSMETransaction[];
  setLastUsedType: (type: TransactionType) => void;
  setLastUsedCategory: (category: string) => void;
  setLastUsedPaymentMethod: (method: PaymentMethod) => void;
  resetLastUsed: () => void;
};

export type SMELedgerStore = SMELedgerStoreState & SMELedgerStoreActions;

function buildSMEStateForPersist(store: SMELedgerStore): SMEState {
  const {
    userId,
    profile,
    transactions,
    categories,
    draftBatchTransactions,
    lastUsedType,
    lastUsedCategory,
    lastUsedPaymentMethod,
  } = store;
  if (!userId) {
    throw new Error("Cannot persist SME state without userId");
  }
  return {
    version: 1,
    userId,
    profile,
    transactions,
    categories,
    draftBatchTransactions,
    lastUsedType,
    lastUsedCategory,
    lastUsedPaymentMethod,
    updatedAt: new Date().toISOString(),
  };
}

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

export const useSMELedgerStore = create<SMELedgerStore>((set, get) => {
  const persistSMEState = async () => {
    const s = get();
    if (!s.userId) return;
    try {
      await saveSMEState(buildSMEStateForPersist(s));
    } catch (err) {
      log.error("Failed to persist SME state:", err);
    }
  };

  return {
    userId: null,
    profile: null,
    transactions: [],
    categories: [],
    isLoading: true,
    error: null,
    draftBatchTransactions: [],
    lastUsedType: null,
    lastUsedCategory: null,
    lastUsedPaymentMethod: null,

    initForUser: async (userId: string | null) => {
      set({ userId, isLoading: true });
      if (!userId) {
        set({
          profile: null,
          transactions: [],
          categories: [],
          draftBatchTransactions: [],
          lastUsedType: null,
          lastUsedCategory: null,
          lastUsedPaymentMethod: null,
          isLoading: false,
        });
        return;
      }
      await get().loadState();
    },

    loadState: async () => {
      const { userId } = get();
      if (!userId) {
        set({
          profile: null,
          transactions: [],
          categories: [],
          draftBatchTransactions: [],
          lastUsedType: null,
          lastUsedCategory: null,
          lastUsedPaymentMethod: null,
          isLoading: false,
        });
        return;
      }

      const startUserId = userId;
      const isInitialLoad = !get().profile && get().transactions.length === 0;

      if (isInitialLoad) {
        set({ isLoading: true, error: null });
      } else {
        set({ error: null });
      }

      try {
        const state = await loadSMEState(startUserId);
        if (get().userId !== startUserId) return;

        set({
          profile: state.profile,
          transactions: state.transactions,
          categories: state.categories,
          draftBatchTransactions: state.draftBatchTransactions ?? [],
          lastUsedType: state.lastUsedType ?? null,
          lastUsedCategory: state.lastUsedCategory ?? null,
          lastUsedPaymentMethod: state.lastUsedPaymentMethod ?? null,
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

      set({ profile });
      await saveSMEState(buildSMEStateForPersist(get()));

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

    addTransactionLocal: async (params) => {
      const { userId } = get();
      if (!userId) throw new Error("User not authenticated");

      const id = uuidv4();
      const now = new Date().toISOString();
      const vatAmount = calculateVAT(
        params.amount,
        params.vatApplicable ?? true,
      );

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

      const nextTxs = [tx, ...get().transactions];
      set({ transactions: nextTxs });
      await saveSMEState(buildSMEStateForPersist(get()));

      const mutation = await enqueueSMEMutation(userId, {
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "sme_insert_transaction",
        payload: toSMETransactionRow(tx),
      });

      return { mutationId: mutation.id, mutation };
    },

    addTransaction: async (params) => {
      const { userId } = get();
      if (!userId) throw new Error("User not authenticated");

      const { mutationId, mutation } = await get().addTransactionLocal(params);
      await trySyncSMEMutation(userId, mutation);
      return { mutationId };
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
        vatAmount:
          params.amount !== undefined || params.vatApplicable !== undefined
            ? calculateVAT(
                params.amount ?? existing.amount,
                params.vatApplicable ?? existing.vatApplicable,
              )
            : existing.vatAmount,
        updatedAt: now,
      };

      const nextTxs = get().transactions.map((t) =>
        t.id === id ? updated : t,
      );
      set({ transactions: nextTxs });
      await saveSMEState(buildSMEStateForPersist(get()));

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
      await saveSMEState(buildSMEStateForPersist(get()));

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
      await saveSMEState(buildSMEStateForPersist(get()));

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
      await saveSMEState(buildSMEStateForPersist(get()));

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
      await saveSMEState(buildSMEStateForPersist(get()));

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
      set({
        userId: null,
        profile: null,
        transactions: [],
        categories: [],
        error: null,
        draftBatchTransactions: [],
        lastUsedType: null,
        lastUsedCategory: null,
        lastUsedPaymentMethod: null,
      });
    },

    addToDraftBatch: (draft) => {
      const { draftBatchTransactions } = get();
      const newItem: DraftSMETransaction = {
        ...draft,
        tempId: uuidv4(),
      };
      set({ draftBatchTransactions: [...draftBatchTransactions, newItem] });
      void persistSMEState();
    },

    removeFromDraftBatch: (tempId) => {
      const { draftBatchTransactions } = get();
      set({
        draftBatchTransactions: draftBatchTransactions.filter(
          (item) => item.tempId !== tempId,
        ),
      });
      void persistSMEState();
    },

    clearDraftBatch: () => {
      set({ draftBatchTransactions: [] });
      void persistSMEState();
    },

    getDraftBatchTransactions: () => {
      return get().draftBatchTransactions;
    },

    setLastUsedType: (type) => {
      set({ lastUsedType: type });
      void persistSMEState();
    },

    setLastUsedCategory: (category) => {
      set({ lastUsedCategory: category });
      void persistSMEState();
    },

    setLastUsedPaymentMethod: (method) => {
      set({ lastUsedPaymentMethod: method });
      void persistSMEState();
    },

    resetLastUsed: () => {
      set({
        lastUsedType: null,
        lastUsedCategory: null,
        lastUsedPaymentMethod: null,
      });
      void persistSMEState();
    },
  };
});
