import { useBudgetStore } from "@/stores/budgetStore";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useDebtStore } from "@/stores/debtStore";
import { usePersonalizationStore } from "@/stores/personalizationStore";
import { useProfileVitalsStore } from "@/stores/profileVitalsStore";
import { useProgressStore } from "@/stores/progressStore";
import { useRecurringExpensesStore } from "@/stores/recurringExpensesStore";
import { useSMELedgerStore } from "@/stores/smeLedgerStore";

/**
 * Clears in-memory Zustand state after auth storage is wiped (logout).
 * Keeps prior user data from persisting until hooks re-run.
 */
export async function resetStoresOnLogout(): Promise<void> {
  const resetTasks = [
    { name: "cashFlowStore", fn: () => useCashFlowStore.getState().resetForLogout() },
    { name: "personalizationStore", fn: () => usePersonalizationStore.getState().initForUser(null) },
    { name: "profileVitalsStore", fn: () => useProfileVitalsStore.getState().initForUser(null) },
    { name: "progressStore", fn: () => useProgressStore.getState().initForUser(null) },
    { name: "smeLedgerStore", fn: () => useSMELedgerStore.getState().initForUser(null) },
    { name: "budgetStore", fn: () => useBudgetStore.getState().initForUser(null) },
    { name: "recurringExpensesStore", fn: () => useRecurringExpensesStore.getState().initForUser(null) },
    { name: "debtStore", fn: () => useDebtStore.getState().initForUser(null) },
  ];

  await Promise.all(
    resetTasks.map(async (task) => {
      try {
        await task.fn();
      } catch (err) {
        console.error(`Failed to reset ${task.name}:`, err);
      }
    })
  );
}