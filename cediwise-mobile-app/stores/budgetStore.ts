import { DeviceEventEmitter } from "react-native";
import { create } from "zustand";
import type { BudgetQueue, BudgetState, DraftBudgetTransaction } from "../types/budget";
import {
  BUDGET_CHANGED_EVENT,
  createEmptyBudgetState,
  createEmptyQueue,
  loadBudgetQueue,
  loadBudgetState,
  saveBudgetState,
} from "../utils/budgetStorage";
import { uuidv4 } from "../utils/uuid";

export type BudgetStoreState = {
  userId: string | null;
  state: BudgetState | null;
  queue: BudgetQueue | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncRunEndedAt: number | null;
  retryIn: number | null;
  draftBatchTransactions: DraftBudgetTransaction[];
  lastUsedBucket: "needs" | "wants" | "savings" | null;
  lastUsedCategoryId: string | null;
};

export type BudgetInitOptions = {
  /** When true, reload from disk even if this user is already hydrated. */
  force?: boolean;
};

export type BudgetStoreActions = {
  initForUser: (
    userId: string | null,
    options?: BudgetInitOptions,
  ) => Promise<void>;
  reload: () => Promise<void>;
  persistState: (next: BudgetState) => Promise<void>;
  refreshQueue: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncRunEndedAt: (at: number | null) => void;
  setRetryIn: (seconds: number | null) => void;
  clearSyncRunResult: () => void;
  addToDraftBatch: (draft: Omit<DraftBudgetTransaction, "tempId">) => void;
  updateDraftBatchItem: (tempId: string, draft: Omit<DraftBudgetTransaction, "tempId">) => void;
  removeFromDraftBatch: (tempId: string) => void;
  clearDraftBatch: () => void;
  setLastUsedBucket: (bucket: "needs" | "wants" | "savings") => void;
  setLastUsedCategory: (categoryId: string) => void;
  getDraftBatchTransactions: () => DraftBudgetTransaction[];
  resetLastUsed: () => void;
};

export type BudgetStore = BudgetStoreState & BudgetStoreActions;

const initialState: BudgetStoreState = {
  userId: null,
  state: null,
  queue: null,
  isLoading: true,
  isSyncing: false,
  lastSyncRunEndedAt: null,
  retryIn: null,
  draftBatchTransactions: [],
  lastUsedBucket: null,
  lastUsedCategoryId: null,
};

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  ...initialState,

  initForUser: async (userId: string | null, options?: BudgetInitOptions) => {
    const force = options?.force ?? false;
    if (!userId) {
      set({ userId: null, state: null, queue: null, isLoading: false });
      return;
    }

    const { userId: currentId, state, isLoading } = get();
    if (!force && userId === currentId && isLoading) {
      return;
    }
    if (!force && userId === currentId && state !== null && !isLoading) {
      return;
    }

    set({ userId, isLoading: true });
    const startUserId = userId;
    try {
      const [state, queue] = await Promise.all([
        loadBudgetState(startUserId),
        loadBudgetQueue(startUserId),
      ]);
      if (get().userId !== startUserId) return;
      set({ state, queue, isLoading: false });
    } catch {
      if (get().userId !== startUserId) return;
      set({
        state: createEmptyBudgetState(startUserId),
        queue: createEmptyQueue(startUserId),
        isLoading: false,
      });
    }
  },

  reload: async () => {
    const { userId, state: existingState } = get();
    if (!userId) {
      set({ state: null, queue: null, isLoading: false });
      return;
    }
    const startUserId = userId;
    const isInitialLoad = !existingState;
    if (isInitialLoad) {
      set({ isLoading: true });
    }
    try {
      const [state, queue] = await Promise.all([
        loadBudgetState(startUserId),
        loadBudgetQueue(startUserId),
      ]);
      if (get().userId !== startUserId) return;
      set({ state, queue, isLoading: false });
    } catch {
      if (get().userId !== startUserId) return;
      set({
        state: createEmptyBudgetState(startUserId),
        queue: createEmptyQueue(startUserId),
        isLoading: false,
      });
    }
  },

  persistState: async (next: BudgetState) => {
    set({ state: next });
    await saveBudgetState(next, { skipEmit: true });
  },

  refreshQueue: async () => {
    const { userId } = get();
    if (!userId) return;
    const queue = await loadBudgetQueue(userId);
    set({ queue });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncRunEndedAt: (at) => set({ lastSyncRunEndedAt: at }),
  setRetryIn: (seconds) => set({ retryIn: seconds }),
  clearSyncRunResult: () => set({ lastSyncRunEndedAt: null }),

  addToDraftBatch: (draft) => {
    const { draftBatchTransactions } = get();
    const newItem: DraftBudgetTransaction = {
      ...draft,
      tempId: uuidv4(),
    };
    set({ draftBatchTransactions: [...draftBatchTransactions, newItem] });
  },

  updateDraftBatchItem: (tempId, draft) => {
    const { draftBatchTransactions } = get();
    set({
      draftBatchTransactions: draftBatchTransactions.map((item) =>
        item.tempId === tempId ? { ...item, ...draft } : item
      ),
    });
  },

  removeFromDraftBatch: (tempId) => {
    const { draftBatchTransactions } = get();
    set({
      draftBatchTransactions: draftBatchTransactions.filter(
        (item) => item.tempId !== tempId
      ),
    });
  },

  clearDraftBatch: () => {
    set({ draftBatchTransactions: [], lastUsedBucket: null, lastUsedCategoryId: null });
  },

  setLastUsedBucket: (bucket) => {
    set({ lastUsedBucket: bucket });
  },

  setLastUsedCategory: (categoryId) => {
    set({ lastUsedCategoryId: categoryId });
  },

  getDraftBatchTransactions: () => {
    return get().draftBatchTransactions;
  },

  resetLastUsed: () => {
    set({ lastUsedBucket: null, lastUsedCategoryId: null });
  },
}));

// Single listener for BUDGET_CHANGED_EVENT; reloads store when external code (vitals, budget-templates) emits.
DeviceEventEmitter.addListener(
  BUDGET_CHANGED_EVENT,
  (payload?: { userId?: string }) => {
    const { userId, reload } = useBudgetStore.getState();
    if (payload?.userId && payload.userId === userId) {
      void reload();
    }
  }
);
