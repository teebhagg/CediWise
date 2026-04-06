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
  await Promise.all([
    useCashFlowStore.getState().resetForLogout(),
    usePersonalizationStore.getState().initForUser(null),
    useProfileVitalsStore.getState().initForUser(null),
    useProgressStore.getState().initForUser(null),
    useSMELedgerStore.getState().initForUser(null),
    useBudgetStore.getState().initForUser(null),
    useRecurringExpensesStore.getState().initForUser(null),
    useDebtStore.getState().initForUser(null),
  ]);
}
