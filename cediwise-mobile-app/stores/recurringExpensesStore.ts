import type {
  BudgetBucket,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "@/types/budget";
import { enqueueMutation } from "@/utils/budgetStorage";
import { flushBudgetQueue } from "@/utils/budgetSync";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import { uuidv4 } from "@/utils/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type AddRecurringExpenseParams = {
  name: string;
  amount: number;
  frequency: RecurringExpenseFrequency;
  bucket: BudgetBucket;
  categoryId?: string | null;
  startDate?: string;
  endDate?: string | null;
  autoAllocate?: boolean;
};

export type UpdateRecurringExpenseParams = {
  name?: string;
  amount?: number;
  frequency?: RecurringExpenseFrequency;
  bucket?: BudgetBucket;
  categoryId?: string | null;
  endDate?: string | null;
  isActive?: boolean;
  autoAllocate?: boolean;
};

const RECURRING_CACHE_PREFIX = "@cediwise_cache_recurring_expenses:";

function recurringCacheKey(userId: string): string {
  return `${RECURRING_CACHE_PREFIX}${userId}`;
}

function toRecurringRow(expense: RecurringExpense): Record<string, unknown> {
  return {
    id: expense.id,
    user_id: expense.userId,
    name: expense.name,
    amount: expense.amount,
    frequency: expense.frequency,
    bucket: expense.bucket,
    category_id: expense.categoryId,
    start_date: expense.startDate,
    end_date: expense.endDate,
    is_active: expense.isActive,
    auto_allocate: expense.autoAllocate,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

function recurringFromRow(row: any): RecurringExpense {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    frequency: row.frequency as RecurringExpenseFrequency,
    bucket: row.bucket as BudgetBucket,
    categoryId: row.category_id,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    autoAllocate: row.auto_allocate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type RecurringExpensesStoreState = {
  userId: string | null;
  recurringExpenses: RecurringExpense[];
  isLoading: boolean;
  error: string | null;
};

export type RecurringExpensesStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  loadRecurringExpenses: () => Promise<void>;
  addRecurringExpense: (params: AddRecurringExpenseParams) => Promise<void>;
  updateRecurringExpense: (
    id: string,
    params: UpdateRecurringExpenseParams
  ) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
};

export type RecurringExpensesStore =
  RecurringExpensesStoreState & RecurringExpensesStoreActions;

export const useRecurringExpensesStore = create<RecurringExpensesStore>(
  (set, get) => ({
    userId: null,
    recurringExpenses: [],
    isLoading: true,
    error: null,

    initForUser: async (userId: string | null) => {
      set({ userId, isLoading: true });
      if (!userId) {
        set({ recurringExpenses: [], isLoading: false });
        return;
      }
      await get().loadRecurringExpenses();
    },

    loadRecurringExpenses: async () => {
      const { userId } = get();
      if (!userId) {
        set({ recurringExpenses: [], isLoading: false });
        return;
      }
      if (!supabase) {
        set({ error: "Supabase not configured", isLoading: false });
        return;
      }

      const startUserId = userId;
      set({ isLoading: true, error: null });

      const cached = await AsyncStorage.getItem(
        recurringCacheKey(startUserId)
      );
      if (cached && get().userId === startUserId) {
        try {
          const rows = JSON.parse(cached) as any[];
          set({
            recurringExpenses: rows.map(recurringFromRow),
            isLoading: false,
          });
        } catch {
          // ignore malformed cache
        }
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("recurring_expenses")
          .select("*")
          .eq("user_id", startUserId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        if (get().userId !== startUserId) return;

        const expenses: RecurringExpense[] = (data || []).map((row) =>
          recurringFromRow(row)
        );

        set({ recurringExpenses: expenses });

        await AsyncStorage.setItem(
          recurringCacheKey(startUserId),
          JSON.stringify(expenses.map(toRecurringRow))
        );
      } catch (err) {
        if (get().userId !== startUserId) return;
        log.error("Failed to load recurring expenses:", err);
        set({
          error:
            err instanceof Error
              ? err.message
              : "Failed to load recurring expenses",
        });
      } finally {
        if (get().userId === startUserId) {
          set({ isLoading: false });
        }
      }
    },

    addRecurringExpense: async (params) => {
      const { userId } = get();
      if (!userId) throw new Error("User not authenticated");

      const id = uuidv4();
      const now = new Date().toISOString();
      const startDate =
        params.startDate || new Date().toISOString().split("T")[0];

      const newExpense: RecurringExpense = {
        id,
        userId,
        name: params.name,
        amount: params.amount,
        frequency: params.frequency,
        bucket: params.bucket,
        categoryId: params.categoryId,
        startDate,
        endDate: params.endDate || null,
        isActive: true,
        autoAllocate: params.autoAllocate ?? true,
        createdAt: now,
        updatedAt: now,
      };

      set((s) => {
        const next = [newExpense, ...s.recurringExpenses];
        AsyncStorage.setItem(
          recurringCacheKey(userId),
          JSON.stringify(next.map(toRecurringRow))
        ).catch(() => {});
        return { recurringExpenses: next };
      });

      await enqueueMutation(userId, {
        id,
        userId,
        createdAt: now,
        kind: "insert_recurring_expense",
        payload: {
          id,
          user_id: userId,
          name: params.name,
          amount: params.amount,
          frequency: params.frequency,
          bucket: params.bucket,
          category_id: params.categoryId,
          start_date: startDate,
          end_date: params.endDate,
          is_active: true,
          auto_allocate: params.autoAllocate ?? true,
        },
      });

      await flushBudgetQueue(userId);
    },

    updateRecurringExpense: async (id, params) => {
      const { userId } = get();
      if (!userId) throw new Error("User not authenticated");

      set((s) => {
        const next = s.recurringExpenses.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                ...params,
                updatedAt: new Date().toISOString(),
              }
            : expense
        );
        AsyncStorage.setItem(
          recurringCacheKey(userId),
          JSON.stringify(next.map(toRecurringRow))
        ).catch(() => {});
        return { recurringExpenses: next };
      });

      const now = new Date().toISOString();
      await enqueueMutation(userId, {
        id: uuidv4(),
        userId,
        createdAt: now,
        kind: "update_recurring_expense",
        payload: {
          id,
          ...params,
          category_id: params.categoryId,
          end_date: params.endDate,
          is_active: params.isActive,
          auto_allocate: params.autoAllocate,
        },
      });

      await flushBudgetQueue(userId);
    },

    deleteRecurringExpense: async (id) => {
      const { userId } = get();
      if (!userId) throw new Error("User not authenticated");

      set((s) => {
        const next = s.recurringExpenses.filter((e) => e.id !== id);
        AsyncStorage.setItem(
          recurringCacheKey(userId),
          JSON.stringify(next.map(toRecurringRow))
        ).catch(() => {});
        return { recurringExpenses: next };
      });

      const now = new Date().toISOString();
      await enqueueMutation(userId, {
        id: uuidv4(),
        userId,
        createdAt: now,
        kind: "delete_recurring_expense",
        payload: { id },
      });

      await flushBudgetQueue(userId);
    },
  })
);
