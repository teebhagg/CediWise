import { useAuth } from "@/hooks/useAuth";
import {
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
import { useCallback, useEffect, useState } from "react";

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

export type UseRecurringExpensesReturn = {
  recurringExpenses: RecurringExpense[];
  isLoading: boolean;
  error: string | null;
  addRecurringExpense: (params: AddRecurringExpenseParams) => Promise<void>;
  updateRecurringExpense: (
    id: string,
    params: UpdateRecurringExpenseParams
  ) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  getMonthlyTotal: (bucket?: BudgetBucket) => number;
  getActiveExpenses: () => RecurringExpense[];
  refresh: () => Promise<void>;
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

export function useRecurringExpenses(): UseRecurringExpensesReturn {
  const { user } = useAuth();
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistRecurringCache = useCallback(
    async (items: RecurringExpense[]) => {
      if (!user?.id) return;
      try {
        await AsyncStorage.setItem(
          recurringCacheKey(user.id),
          JSON.stringify(items.map(toRecurringRow)),
        );
      } catch {
        // ignore cache write errors
      }
    },
    [user?.id]
  );

  // Convert frequency to monthly multiplier
  const toMonthlyAmount = useCallback(
    (amount: number, frequency: RecurringExpenseFrequency): number => {
      switch (frequency) {
        case "weekly":
          return amount * 4.33; // ~4.33 weeks per month
        case "bi_weekly":
          return amount * 2.165; // ~2.165 bi-weeks per month
        case "monthly":
          return amount;
        case "quarterly":
          return amount / 3;
        case "annually":
          return amount / 12;
        default:
          return amount;
      }
    },
    []
  );

  // Load recurring expenses from Supabase
  const loadRecurringExpenses = useCallback(async () => {
    if (!user?.id) {
      setRecurringExpenses([]);
      setIsLoading(false);
      return;
    }
    if (!supabase) {
      setError("Supabase not configured");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const cached = await AsyncStorage.getItem(recurringCacheKey(user.id));
      if (cached) {
        try {
          const rows = JSON.parse(cached) as any[];
          setRecurringExpenses(rows.map(recurringFromRow));
          setIsLoading(false);
        } catch {
          // ignore malformed cache payload
        }
      }

      const { data, error: fetchError } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const expenses: RecurringExpense[] = (data || []).map((row) =>
        recurringFromRow(row)
      );

      setRecurringExpenses(expenses);
      await persistRecurringCache(expenses);
    } catch (err) {
      log.error("Failed to load recurring expenses:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load recurring expenses"
      );
    } finally {
      setIsLoading(false);
    }
  }, [persistRecurringCache, user?.id]);

  useEffect(() => {
    loadRecurringExpenses();
  }, [loadRecurringExpenses]);

  // Add recurring expense
  const addRecurringExpense = useCallback(
    async (params: AddRecurringExpenseParams) => {
      if (!user?.id) throw new Error("User not authenticated");

      const id = uuidv4();
      const now = new Date().toISOString();
      const startDate =
        params.startDate || new Date().toISOString().split("T")[0];

      const newExpense: RecurringExpense = {
        id,
        userId: user.id,
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

      // Optimistic update
      setRecurringExpenses((prev) => {
        const next = [newExpense, ...prev];
        void persistRecurringCache(next);
        return next;
      });

      // Queue mutation
      await enqueueMutation(user.id, {
        id,
        userId: user.id,
        createdAt: now,
        kind: "insert_recurring_expense",
        payload: {
          id,
          user_id: user.id,
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

      // Try immediate sync
      await flushBudgetQueue(user.id);
    },
    [persistRecurringCache, user?.id]
  );

  // Update recurring expense
  const updateRecurringExpense = useCallback(
    async (id: string, params: UpdateRecurringExpenseParams) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Optimistic update
      setRecurringExpenses((prev) => {
        const next = prev.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                ...params,
                updatedAt: new Date().toISOString(),
              }
            : expense
        );
        void persistRecurringCache(next);
        return next;
      });

      // Queue mutation
      const now = new Date().toISOString();
      await enqueueMutation(user.id, {
        id: uuidv4(),
        userId: user.id,
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

      // Try immediate sync
      await flushBudgetQueue(user.id);
    },
    [persistRecurringCache, user?.id]
  );

  // Delete recurring expense
  const deleteRecurringExpense = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Optimistic update
      setRecurringExpenses((prev) => {
        const next = prev.filter((expense) => expense.id !== id);
        void persistRecurringCache(next);
        return next;
      });

      // Queue mutation
      const now = new Date().toISOString();
      await enqueueMutation(user.id, {
        id: uuidv4(),
        userId: user.id,
        createdAt: now,
        kind: "delete_recurring_expense",
        payload: { id },
      });

      // Try immediate sync
      await flushBudgetQueue(user.id);
    },
    [persistRecurringCache, user?.id]
  );

  // Get monthly total (optionally filtered by bucket)
  const getMonthlyTotal = useCallback(
    (bucket?: BudgetBucket): number => {
      return recurringExpenses
        .filter(
          (expense) =>
            expense.isActive && (!bucket || expense.bucket === bucket)
        )
        .reduce((total, expense) => {
          return total + toMonthlyAmount(expense.amount, expense.frequency);
        }, 0);
    },
    [recurringExpenses, toMonthlyAmount]
  );

  // Get active expenses
  const getActiveExpenses = useCallback((): RecurringExpense[] => {
    return recurringExpenses.filter((expense) => expense.isActive);
  }, [recurringExpenses]);

  return {
    recurringExpenses,
    isLoading,
    error,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    getMonthlyTotal,
    getActiveExpenses,
    refresh: loadRecurringExpenses,
  };
}
