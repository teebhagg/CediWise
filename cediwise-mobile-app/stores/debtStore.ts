import type { Debt } from "@/types/budget";
import { enqueueMutation } from "@/utils/budgetStorage";
import { trySyncMutation } from "@/utils/budgetSync";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import { uuidv4 } from "@/utils/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type AddDebtParams = {
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate?: number | null;
  startDate?: string;
  targetPayoffDate?: string | null;
  categoryId?: string | null;
  sourceCycleId?: string | null;
};

export type UpdateDebtParams = {
  name?: string;
  remainingAmount?: number;
  monthlyPayment?: number;
  interestRate?: number | null;
  targetPayoffDate?: string | null;
  isActive?: boolean;
  categoryId?: string | null;
};

const DEBTS_CACHE_PREFIX = "@cediwise_cache_debts:";

function debtsCacheKey(userId: string): string {
  return `${DEBTS_CACHE_PREFIX}${userId}`;
}

function makeQueueId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDebtRow(debt: Debt): Record<string, unknown> {
  return {
    id: debt.id,
    user_id: debt.userId,
    name: debt.name,
    total_amount: debt.totalAmount,
    remaining_amount: debt.remainingAmount,
    monthly_payment: debt.monthlyPayment,
    interest_rate: debt.interestRate,
    start_date: debt.startDate,
    target_payoff_date: debt.targetPayoffDate,
    is_active: debt.isActive,
    category_id: debt.categoryId,
    source_cycle_id: debt.sourceCycleId ?? null,
    created_at: debt.createdAt,
    updated_at: debt.updatedAt,
  };
}

function debtFromRow(row: any): Debt {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    totalAmount: Number(row.total_amount),
    remainingAmount: Number(row.remaining_amount),
    monthlyPayment: Number(row.monthly_payment),
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : null,
    startDate: row.start_date,
    targetPayoffDate: row.target_payoff_date,
    isActive: row.is_active,
    categoryId: row.category_id,
    sourceCycleId: row.source_cycle_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type DebtStoreState = {
  userId: string | null;
  debts: Debt[];
  isLoading: boolean;
  error: string | null;
};

export type DebtStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  loadDebts: () => Promise<void>;
  addDebt: (params: AddDebtParams) => Promise<void>;
  updateDebt: (id: string, params: UpdateDebtParams) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number) => Promise<void>;
};

export type DebtStore = DebtStoreState & DebtStoreActions;

export const useDebtStore = create<DebtStore>((set, get) => ({
  userId: null,
  debts: [],
  isLoading: true,
  error: null,

  initForUser: async (userId: string | null) => {
    set({ userId, isLoading: true });
    if (!userId) {
      set({ debts: [], isLoading: false });
      return;
    }
    await get().loadDebts();
  },

  loadDebts: async () => {
    const { userId } = get();
    if (!userId) {
      set({ debts: [], isLoading: false });
      return;
    }
    if (!supabase) {
      set({ error: "Supabase not configured", isLoading: false });
      return;
    }

    const startUserId = userId;
    set({ isLoading: true, error: null });
    try {
      const cached = await AsyncStorage.getItem(debtsCacheKey(startUserId));
      if (cached && get().userId === startUserId) {
        try {
          const rows = JSON.parse(cached) as any[];
          set({ debts: rows.map(debtFromRow), isLoading: false });
        } catch {
          // ignore malformed cache
        }
      }

      const { data, error: fetchError } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", startUserId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (get().userId !== startUserId) return;

      const loadedDebts: Debt[] = (data || []).map((row) => debtFromRow(row));
      set({ debts: loadedDebts });

      try {
        await AsyncStorage.setItem(
          debtsCacheKey(startUserId),
          JSON.stringify(loadedDebts.map(toDebtRow))
        );
      } catch {
        // ignore cache write errors
      }
    } catch (err) {
      if (get().userId !== startUserId) return;
      log.error("Failed to load debts:", err);
      set({
        error: err instanceof Error ? err.message : "Failed to load debts",
      });
    } finally {
      if (get().userId === startUserId) {
        set({ isLoading: false });
      }
    }
  },

  addDebt: async (params) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const id = uuidv4();
    const now = new Date().toISOString();
    const startDate = params.startDate || new Date().toISOString().split("T")[0];

    const newDebt: Debt = {
      id,
      userId,
      name: params.name,
      totalAmount: params.totalAmount,
      remainingAmount: params.remainingAmount,
      monthlyPayment: params.monthlyPayment,
      interestRate: params.interestRate || null,
      startDate,
      targetPayoffDate: params.targetPayoffDate || null,
      isActive: true,
      categoryId: params.categoryId || null,
      sourceCycleId: params.sourceCycleId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const next = [newDebt, ...s.debts];
      AsyncStorage.setItem(
        debtsCacheKey(userId),
        JSON.stringify(next.map(toDebtRow))
      ).catch(() => {});
      return { debts: next };
    });

    const mutation = await enqueueMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: now,
      kind: "insert_debt",
      payload: {
        id,
        user_id: userId,
        name: params.name,
        total_amount: params.totalAmount,
        remaining_amount: params.remainingAmount,
        monthly_payment: params.monthlyPayment,
        interest_rate: params.interestRate,
        start_date: startDate,
        target_payoff_date: params.targetPayoffDate,
        is_active: true,
        category_id: params.categoryId,
        source_cycle_id: params.sourceCycleId ?? null,
      },
    });

    await trySyncMutation(userId, mutation);
  },

  updateDebt: async (id, params) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    set((s) => {
      const next = s.debts.map((debt) =>
        debt.id === id
          ? { ...debt, ...params, updatedAt: new Date().toISOString() }
          : debt
      );
      AsyncStorage.setItem(
        debtsCacheKey(userId),
        JSON.stringify(next.map(toDebtRow))
      ).catch(() => {});
      return { debts: next };
    });

    const mutation = await enqueueMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "update_debt",
      payload: {
        id,
        ...params,
        remaining_amount: params.remainingAmount,
        monthly_payment: params.monthlyPayment,
        interest_rate: params.interestRate,
        target_payoff_date: params.targetPayoffDate,
        is_active: params.isActive,
        category_id: params.categoryId,
      },
    });

    await trySyncMutation(userId, mutation);
  },

  deleteDebt: async (id) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    set((s) => {
      const next = s.debts.filter((d) => d.id !== id);
      AsyncStorage.setItem(
        debtsCacheKey(userId),
        JSON.stringify(next.map(toDebtRow))
      ).catch(() => {});
      return { debts: next };
    });

    const mutation = await enqueueMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "delete_debt",
      payload: { id },
    });

    await trySyncMutation(userId, mutation);
  },

  recordPayment: async (id, amount) => {
    const { userId, debts } = get();
    if (!userId) throw new Error("User not authenticated");

    const debt = debts.find((d) => d.id === id);
    if (!debt) throw new Error("Debt not found");

    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    const isActive = newRemaining > 0;

    set((s) => {
      const next = s.debts.map((d) =>
        d.id === id
          ? {
              ...d,
              remainingAmount: newRemaining,
              isActive,
              updatedAt: new Date().toISOString(),
            }
          : d
      );
      AsyncStorage.setItem(
        debtsCacheKey(userId),
        JSON.stringify(next.map(toDebtRow))
      ).catch(() => {});
      return { debts: next };
    });

    const mutation = await enqueueMutation(userId, {
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "record_debt_payment",
      payload: {
        id,
        amount,
        remaining_amount: newRemaining,
        is_active: isActive,
      },
    });

    await trySyncMutation(userId, mutation);
  },
}));
