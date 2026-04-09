import type { BudgetCycle } from "@/types/budget";
import type { ProfileVitals } from "@/utils/profileVitals";
import {
  computeIntelligentAllocationFromProfile,
  preferencesDifferSignificantlyFromCycle,
  profileFinancialPriorityPhrase,
  profileLifeStagePhrase,
} from "@/utils/budgetFromPreferences";
import type { BudgetPreferenceMigrationPromptPayload } from "@/utils/budgetPreferenceTypes";

function latestCycleFromState(cycles: BudgetCycle[]): BudgetCycle | null {
  const sorted = [...cycles].sort(
    (a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  return sorted[0] ?? null;
}

export type MigrationSkippedChecker = (
  userId: string,
  cycleId: string
) => Promise<boolean>;

/**
 * Decide whether to show the preference migration modal. Pure guards + one async skip lookup.
 */
export async function resolveBudgetPreferenceMigrationPrompt(input: {
  userId: string | null | undefined;
  budgetLoading: boolean;
  profileLoading: boolean;
  vitals: ProfileVitals | null;
  pendingCount: number;
  cycles: BudgetCycle[];
  /** When true, do not compute another payload (modal already showing). */
  modalAlreadyOpen: boolean;
  isCancelled: () => boolean;
  isMigrationSkipped: MigrationSkippedChecker;
}): Promise<BudgetPreferenceMigrationPromptPayload | null> {
  const {
    userId,
    budgetLoading,
    profileLoading,
    vitals,
    pendingCount,
    cycles,
    modalAlreadyOpen,
    isCancelled,
    isMigrationSkipped,
  } = input;

  if (!userId || budgetLoading || profileLoading) return null;
  if (!vitals?.setup_completed) return null;
  if (pendingCount > 0) return null;
  if (modalAlreadyOpen) return null;

  const latestCycle = latestCycleFromState(cycles);
  if (!latestCycle || isCancelled()) return null;

  const skipped = await isMigrationSkipped(userId, latestCycle.id);
  if (isCancelled() || skipped) return null;
  if (!preferencesDifferSignificantlyFromCycle(vitals, latestCycle)) return null;

  const suggested = computeIntelligentAllocationFromProfile(vitals);
  return {
    cycleId: latestCycle.id,
    current: {
      needsPct: latestCycle.needsPct,
      wantsPct: latestCycle.wantsPct,
      savingsPct: latestCycle.savingsPct,
    },
    suggested: {
      needsPct: suggested.needsPct,
      wantsPct: suggested.wantsPct,
      savingsPct: suggested.savingsPct,
    },
    lifeStagePhrase: profileLifeStagePhrase(vitals.life_stage),
    financialPriorityPhrase: profileFinancialPriorityPhrase(
      vitals.financial_priority
    ),
  };
}
