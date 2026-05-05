/**
 * useSmeLedger hook
 * Main integration hook for the SME Ledger feature.
 * Wraps the smeLedgerStore, VAT engine, and threshold monitoring.
 */

import { useSMELedgerStore } from "@/stores/smeLedgerStore";
import type { SMETotals, ThresholdInfo } from "@/types/sme";
import { loadSMEQueue } from "@/utils/smeStorage";
import { flushSMEQueue, hydrateSMEFromRemote } from "@/utils/smeSync";
import { reportError } from "@/utils/telemetry";
import {
  computeAnnualTurnover,
  computeTotals,
  getThresholdInfo,
} from "@/utils/vatEngine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSmeLedger() {
  const {
    userId,
    profile,
    transactions,
    categories,
    isLoading,
    error,
    initForUser,
    loadState,
    setupBusiness,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
    clearLocal,
    addToDraftBatch,
    removeFromDraftBatch,
    clearDraftBatch,
    getDraftBatchTransactions,
  } = useSMELedgerStore();

  // Computed values
  const totals: SMETotals = useMemo(
    () => computeTotals(transactions),
    [transactions],
  );

  const annualTurnover: number = useMemo(
    () =>
      computeAnnualTurnover(transactions, profile?.fiscalYearStartMonth ?? 1),
    [transactions, profile?.fiscalYearStartMonth],
  );

  const threshold: ThresholdInfo = useMemo(
    () => getThresholdInfo(annualTurnover, profile?.businessType ?? "goods"),
    [annualTurnover, profile?.businessType],
  );

  // Separate income and expense categories
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories],
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  // Filter transactions by type
  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions],
  );

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions],
  );

  // Recent transactions (last 30 days)
  const recentTransactions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return transactions.filter((t) => t.transactionDate >= cutoffStr);
  }, [transactions]);

  // Monthly totals (current month)
  const monthlyTotals: SMETotals = (() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthTransactions = transactions.filter(
      (t) => t.transactionDate >= monthStart,
    );
    return computeTotals(monthTransactions);
  })();

  // Queue status
  const [pendingCount, setPendingCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQueue = useCallback(async () => {
    if (!userId) return;
    const queue = await loadSMEQueue(userId);
    setPendingCount(queue.items.length);
  }, [userId]);

  // Sync with auto-retry on failure
  const syncNow = useCallback(async () => {
    if (!userId) return;

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const { failCount } = await flushSMEQueue(userId);
    await refreshQueue();

    // Auto-retry after 10s if there were failures
    if (failCount > 0) {
      retryTimeoutRef.current = setTimeout(() => {
        syncNow();
      }, 10_000);
    }

    return failCount;
  }, [userId, refreshQueue]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const hydrate = useCallback(
    async (options?: { force?: boolean }) => {
      if (!userId) return;
      try {
        await hydrateSMEFromRemote(userId, options);
      } catch (err) {
        reportError(err, {
          feature: "sme",
          operation: "hydrate_from_remote",
        });
      }
      await loadState();
      await refreshQueue();
    },
    [userId, loadState, refreshQueue],
  );

  // Seed default categories after business setup
  const setupAndSeed = useCallback(
    async (params: Parameters<typeof setupBusiness>[0]) => {
      await setupBusiness(params);

      if (!userId) return;

      const { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } =
        await import("@/types/sme");

      const allCats = [
        ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
          name: c.name,
          type: "income" as const,
          icon: c.icon,
          color: c.color,
        })),
        ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
          name: c.name,
          type: "expense" as const,
          icon: c.icon,
          color: c.color,
        })),
      ];

      await useSMELedgerStore.getState().addCategories(allCats);

      await refreshQueue();
    },
    [userId, setupBusiness, refreshQueue],
  );

  const submitBatchTransactions = useCallback(async (): Promise<{
    success: boolean;
    count: number;
    mutationIds: string[];
  }> => {
    const drafts = useSMELedgerStore.getState().getDraftBatchTransactions();
    if (drafts.length === 0)
      return { success: true, count: 0, mutationIds: [] };

    let successCount = 0;
    const mutationIds: string[] = [];

    for (const draft of drafts) {
      try {
        const { mutationId } = await useSMELedgerStore
          .getState()
          .addTransactionLocal({
            type: draft.type,
            amount: draft.amount,
            description: draft.description,
            category: draft.category,
            transactionDate: draft.transactionDate,
            paymentMethod: draft.paymentMethod,
            vatApplicable: draft.vatApplicable,
            notes: draft.notes,
          });
        if (mutationId) {
          successCount++;
          mutationIds.push(mutationId);
          useSMELedgerStore.getState().removeFromDraftBatch(draft.tempId);
        }
      } catch (err) {
        reportError(err, {
          feature: "sme",
          operation: "submit_batch_transaction_item",
          extra: { draftTempId: draft.tempId },
        });
      }
    }

    return {
      success: successCount === drafts.length,
      count: successCount,
      mutationIds,
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  const syncBatch = useCallback(
    async (mutationIds: string[]) => {
      if (!userId || mutationIds.length === 0) return false;
      setIsSyncing(true);
      try {
        const { flushSMEQueueUntilMutationIdsCleared } =
          await import("@/utils/smeSync");
        const result = await flushSMEQueueUntilMutationIdsCleared(
          userId,
          mutationIds,
        );
        await refreshQueue();
        return result.ok;
      } catch {
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [userId, refreshQueue],
  );

  return {
    // State
    userId,
    profile,
    transactions,
    categories,
    isLoading,
    error,

    // Computed
    totals,
    monthlyTotals,
    annualTurnover,
    threshold,
    incomeCategories,
    expenseCategories,
    incomeTransactions,
    expenseTransactions,
    recentTransactions,
    pendingCount,

    // Setup
    initForUser,
    setupBusiness: setupAndSeed,

    // Transactions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    submitBatchTransactions,
    syncBatch,
    isSyncing,
    addToDraftBatch,
    removeFromDraftBatch,
    clearDraftBatch,
    getDraftBatchTransactions,

    // Categories
    addCategory,
    deleteCategory,

    // Sync
    syncNow,
    hydrate,
    refreshQueue,

    // Cleanup
    clearLocal,
  };
}
