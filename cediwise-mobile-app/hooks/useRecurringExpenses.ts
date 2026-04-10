import { useAuth } from "@/hooks/useAuth";
import {
  useRecurringExpensesStore,
  type AddRecurringExpenseParams,
  type UpdateRecurringExpenseParams,
} from "@/stores/recurringExpensesStore";
import type { BudgetBucket, RecurringExpense } from "@/types/budget";
import {
  filterEffectiveRecurringExpenses,
  toMonthlyEquivalentAmount,
} from "@/utils/recurringHelpers";
import { useCallback, useEffect } from "react";

export type { AddRecurringExpenseParams, UpdateRecurringExpenseParams };

export type UseRecurringExpensesReturn = {
  recurringExpenses: RecurringExpense[];
  isLoading: boolean;
  error: string | null;
  budgetQueueFlushError: string | null;
  clearBudgetQueueFlushError: () => void;
  addRecurringExpense: (params: AddRecurringExpenseParams) => Promise<void>;
  updateRecurringExpense: (
    id: string,
    params: UpdateRecurringExpenseParams,
  ) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  getMonthlyTotal: (bucket?: BudgetBucket) => number;
  getActiveExpenses: () => RecurringExpense[];
  refresh: () => Promise<void>;
};

export function useRecurringExpenses(): UseRecurringExpensesReturn {
  const { user } = useAuth();
  const {
    recurringExpenses,
    isLoading,
    error,
    budgetQueueFlushError,
    clearBudgetQueueFlushError,
    loadRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
  } = useRecurringExpensesStore();

  useEffect(() => {
    void useRecurringExpensesStore.getState().initForUser(user?.id ?? null);
  }, [user?.id]);

  const getMonthlyTotal = useCallback(
    (bucket?: BudgetBucket): number => {
      return filterEffectiveRecurringExpenses(recurringExpenses, new Date())
        .filter((expense) => !bucket || expense.bucket === bucket)
        .reduce(
          (total, expense) =>
            total + toMonthlyEquivalentAmount(expense.amount, expense.frequency),
          0,
        );
    },
    [recurringExpenses],
  );

  const getActiveExpenses = useCallback((): RecurringExpense[] => {
    return filterEffectiveRecurringExpenses(recurringExpenses, new Date());
  }, [recurringExpenses]);

  const refresh = useCallback(async () => {
    await useRecurringExpensesStore.getState().loadRecurringExpenses();
  }, []);

  return {
    recurringExpenses,
    isLoading,
    error,
    budgetQueueFlushError,
    clearBudgetQueueFlushError,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    getMonthlyTotal,
    getActiveExpenses,
    refresh,
  };
}
