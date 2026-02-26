import { useAuth } from "@/hooks/useAuth";
import { Debt } from "@/types/budget";
import { enqueueMutation } from "@/utils/budgetStorage";
import { trySyncMutation } from "@/utils/budgetSync";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import { uuidv4 } from "@/utils/uuid";
import { useCallback, useEffect, useState } from "react";

export type AddDebtParams = {
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate?: number | null;
  startDate?: string;
  targetPayoffDate?: string | null;
  categoryId?: string | null;
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

function makeQueueId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useDebts(monthlyIncome?: number): UseDebtsReturn {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load debts from Supabase
  const loadDebts = useCallback(async () => {
    if (!user?.id) {
      setDebts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const loadedDebts: Debt[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        totalAmount: Number(row.total_amount),
        remainingAmount: Number(row.remaining_amount),
        monthlyPayment: Number(row.monthly_payment),
        interestRate:
          row.interest_rate != null ? Number(row.interest_rate) : null,
        startDate: row.start_date,
        targetPayoffDate: row.target_payoff_date,
        isActive: row.is_active,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setDebts(loadedDebts);
    } catch (err) {
      log.error("Failed to load debts:", err);
      setError(err instanceof Error ? err.message : "Failed to load debts");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Add debt
  const addDebt = useCallback(
    async (params: AddDebtParams) => {
      if (!user?.id) throw new Error("User not authenticated");

      const id = uuidv4();
      const now = new Date().toISOString();
      const startDate =
        params.startDate || new Date().toISOString().split("T")[0];

      const newDebt: Debt = {
        id,
        userId: user.id,
        name: params.name,
        totalAmount: params.totalAmount,
        remainingAmount: params.remainingAmount,
        monthlyPayment: params.monthlyPayment,
        interestRate: params.interestRate || null,
        startDate,
        targetPayoffDate: params.targetPayoffDate || null,
        isActive: true,
        categoryId: params.categoryId || null,
        createdAt: now,
        updatedAt: now,
      };

      // Optimistic update
      setDebts((prev) => [newDebt, ...prev]);

      // Queue mutation
      const mutation = await enqueueMutation(user.id, {
        id: makeQueueId(),
        userId: user.id,
        createdAt: now,
        kind: "insert_debt",
        payload: {
          id,
          user_id: user.id,
          name: params.name,
          total_amount: params.totalAmount,
          remaining_amount: params.remainingAmount,
          monthly_payment: params.monthlyPayment,
          interest_rate: params.interestRate,
          start_date: startDate,
          target_payoff_date: params.targetPayoffDate,
          is_active: true,
          category_id: params.categoryId,
        },
      });

      // Try immediate sync
      await trySyncMutation(user.id, mutation);
    },
    [user?.id]
  );

  // Update debt
  const updateDebt = useCallback(
    async (id: string, params: UpdateDebtParams) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Optimistic update
      setDebts((prev) =>
        prev.map((debt) =>
          debt.id === id
            ? {
                ...debt,
                ...params,
                updatedAt: new Date().toISOString(),
              }
            : debt
        )
      );

      // Queue mutation
      const mutation = await enqueueMutation(user.id, {
        id: makeQueueId(),
        userId: user.id,
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

      // Try immediate sync
      await trySyncMutation(user.id, mutation);
    },
    [user?.id]
  );

  // Delete debt
  const deleteDebt = useCallback(
    async (id: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Optimistic update
      setDebts((prev) => prev.filter((debt) => debt.id !== id));

      // Queue mutation
      const mutation = await enqueueMutation(user.id, {
        id: makeQueueId(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        kind: "delete_debt",
        payload: { id },
      });

      // Try immediate sync
      await trySyncMutation(user.id, mutation);
    },
    [user?.id]
  );

  // Record payment
  const recordPayment = useCallback(
    async (id: string, amount: number) => {
      if (!user?.id) throw new Error("User not authenticated");

      const debt = debts.find((d) => d.id === id);
      if (!debt) throw new Error("Debt not found");

      const newRemaining = Math.max(0, debt.remainingAmount - amount);
      const isActive = newRemaining > 0;

      // Optimistic update
      setDebts((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                remainingAmount: newRemaining,
                isActive,
                updatedAt: new Date().toISOString(),
              }
            : d
        )
      );

      // Queue mutation
      const mutation = await enqueueMutation(user.id, {
        id: makeQueueId(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        kind: "record_debt_payment",
        payload: {
          id,
          amount,
          remaining_amount: newRemaining,
          is_active: isActive,
        },
      });

      // Try immediate sync
      await trySyncMutation(user.id, mutation);
    },
    [user?.id, debts]
  );

  // Calculate projected payoff date
  const calculatePayoffDate = useCallback((debt: Debt): string | null => {
    if (debt.monthlyPayment <= 0 || debt.remainingAmount <= 0) return null;

    const monthsRemaining = Math.ceil(
      debt.remainingAmount / debt.monthlyPayment
    );
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);
    return payoffDate.toISOString().split("T")[0];
  }, []);

  // Get active debts
  const getActiveDebts = useCallback((): Debt[] => {
    return debts.filter((debt) => debt.isActive);
  }, [debts]);

  // Calculate insights
  const insights = useCallback((): DebtInsights => {
    const activeDebts = getActiveDebts();
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + debt.remainingAmount,
      0
    );
    const totalMonthlyPayment = activeDebts.reduce(
      (sum, debt) => sum + debt.monthlyPayment,
      0
    );

    const debtsWithInterest = activeDebts.filter((d) => d.interestRate != null);
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
      monthlyIncome && monthlyIncome > 0
        ? totalMonthlyPayment / monthlyIncome
        : null;

    return {
      totalDebt,
      totalMonthlyPayment,
      averageInterestRate,
      projectedPayoffMonths,
      debtToIncomeRatio,
    };
  }, [debts, monthlyIncome, getActiveDebts])();

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
    refresh: loadDebts,
  };
}
