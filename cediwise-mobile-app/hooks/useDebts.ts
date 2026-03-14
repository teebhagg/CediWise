import { useAuth } from "@/hooks/useAuth";
import {
  useDebtStore,
  type AddDebtParams,
  type UpdateDebtParams,
} from "@/stores/debtStore";
import type { Debt } from "@/types/budget";
import { useCallback, useEffect, useMemo } from "react";

export type { AddDebtParams, UpdateDebtParams };

export type DebtInsights = {
  totalDebt: number;
  totalMonthlyPayment: number;
  averageInterestRate: number;
  projectedPayoffMonths: number;
  debtToIncomeRatio: number | null;
};

export type UseDebtsReturn = {
  debts: Debt[];
  isLoading: boolean;
  error: string | null;
  insights: DebtInsights;
  addDebt: (params: AddDebtParams) => Promise<void>;
  updateDebt: (id: string, params: UpdateDebtParams) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number) => Promise<void>;
  calculatePayoffDate: (debt: Debt) => string | null;
  getActiveDebts: () => Debt[];
  refresh: () => Promise<void>;
};

export function useDebts(monthlyIncome?: number): UseDebtsReturn {
  const { user } = useAuth();
  const { debts, isLoading, error, loadDebts, addDebt, updateDebt, deleteDebt, recordPayment } =
    useDebtStore();

  useEffect(() => {
    void useDebtStore.getState().initForUser(user?.id ?? null);
  }, [user?.id]);

  const getActiveDebts = useCallback((): Debt[] => {
    return debts.filter((debt) => debt.isActive);
  }, [debts]);

  const calculatePayoffDate = useCallback((debt: Debt): string | null => {
    if (debt.monthlyPayment <= 0 || debt.remainingAmount <= 0) return null;
    const monthsRemaining = Math.ceil(
      debt.remainingAmount / debt.monthlyPayment
    );
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);
    return payoffDate.toISOString().split("T")[0];
  }, []);

  const insights = useMemo((): DebtInsights => {
    const activeDebts = debts.filter((d) => d.isActive);
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + debt.remainingAmount,
      0
    );
    const totalMonthlyPayment = activeDebts.reduce(
      (sum, debt) => sum + debt.monthlyPayment,
      0
    );
    const debtsWithInterest = activeDebts.filter(
      (d) => d.interestRate != null
    );
    const averageInterestRate =
      debtsWithInterest.length > 0
        ? debtsWithInterest.reduce(
            (sum, debt) => sum + (debt.interestRate || 0),
            0
          ) / debtsWithInterest.length
        : 0;
    const projectedPayoffMonths =
      totalMonthlyPayment > 0 ? Math.ceil(totalDebt / totalMonthlyPayment) : 0;
    const debtToIncomeRatio =
      monthlyIncome != null && monthlyIncome > 0
        ? totalMonthlyPayment / monthlyIncome
        : null;

    return {
      totalDebt,
      totalMonthlyPayment,
      averageInterestRate,
      projectedPayoffMonths,
      debtToIncomeRatio,
    };
  }, [debts, monthlyIncome]);

  const refresh = useCallback(async () => {
    await useDebtStore.getState().loadDebts();
  }, []);

  return {
    debts,
    isLoading,
    error,
    insights,
    addDebt,
    updateDebt,
    deleteDebt,
    recordPayment,
    calculatePayoffDate,
    getActiveDebts,
    refresh,
  };
}
