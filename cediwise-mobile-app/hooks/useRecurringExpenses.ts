import { useAuth } from "@/hooks/useAuth";
import {
  useRecurringExpensesStore,
  type AddRecurringExpenseParams,
  type UpdateRecurringExpenseParams,
} from "@/stores/recurringExpensesStore";
import type {
  BudgetBucket,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "@/types/budget";
import { useCallback, useEffect } from "react";

export type { AddRecurringExpenseParams, UpdateRecurringExpenseParams };

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

function toMonthlyAmount(
  amount: number,
  frequency: RecurringExpenseFrequency
): number {
  switch (frequency) {
    case "weekly":
      return amount * 4.33;
    case "bi_weekly":
      return amount * 2.165;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "annually":
      return amount / 12;
    default:
      return amount;
  }
}

export function useRecurringExpenses(): UseRecurringExpensesReturn {
  const { user } = useAuth();
  const {
    recurringExpenses,
    isLoading,
    error,
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
      return recurringExpenses
        .filter(
          (expense) =>
            expense.isActive && (!bucket || expense.bucket === bucket)
        )
        .reduce(
          (total, expense) =>
            total + toMonthlyAmount(expense.amount, expense.frequency),
          0
        );
    },
    [recurringExpenses]
  );

  const getActiveExpenses = useCallback((): RecurringExpense[] => {
    return recurringExpenses.filter((expense) => expense.isActive);
  }, [recurringExpenses]);

  const refresh = useCallback(async () => {
    await useRecurringExpensesStore.getState().loadRecurringExpenses();
  }, []);

  return {
    recurringExpenses,
    isLoading,
    error,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    getMonthlyTotal,
    getActiveExpenses,
    refresh,
  };
}
