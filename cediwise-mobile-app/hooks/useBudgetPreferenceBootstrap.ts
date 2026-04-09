import { useEffect, useRef } from "react";
import { useBudget } from "@/hooks/useBudget";
import { useProfileVitals } from "@/hooks/useProfileVitals";
import { runBudgetPreferenceBootstrapCore } from "@/utils/budgetPreferenceBootstrapCore";

/**
 * On app load: if the user has completed vitals, has meaningful preferences,
 * positive salary, a valid payday, and no budget cycles yet, create the first
 * cycle from the same engine as the vitals wizard.
 */
export function useBudgetPreferenceBootstrap(userId: string | null | undefined) {
  const profileVitals = useProfileVitals(userId);
  const {
    state,
    isLoading,
    pendingCount,
    setupBudget,
    addIncomeSource,
    updateIncomeSource,
    recalculateBudget,
    reload,
  } = useBudget(userId ?? null);

  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void runBudgetPreferenceBootstrapCore({
      isCancelled: () => cancelled,
      inFlightRef,
      userId,
      profileLoading: profileVitals.isLoading,
      vitals: profileVitals.vitals,
      budgetLoading: isLoading,
      pendingCount,
      state,
      setupBudget,
      addIncomeSource,
      updateIncomeSource,
      recalculateBudget,
      reload,
    });
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    isLoading,
    profileVitals.isLoading,
    profileVitals.vitals,
    pendingCount,
    state,
    setupBudget,
    addIncomeSource,
    updateIncomeSource,
    recalculateBudget,
    reload,
  ]);
}
