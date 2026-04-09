import type { BudgetState } from "@/types/budget";
import type { ProfileVitals } from "@/utils/profileVitals";
import {
  computeIntelligentAllocationFromProfile,
  hasMeaningfulPreferenceSignals,
} from "@/utils/budgetFromPreferences";

export type BudgetPreferenceBootstrapFns = {
  setupBudget: (params: {
    paydayDay: number;
    needsPct?: number;
    wantsPct?: number;
    savingsPct?: number;
    interests?: string[];
    seedCategories?: boolean;
    lifeStage?:
      | "student"
      | "young_professional"
      | "family"
      | "retiree"
      | null;
  }) => Promise<void>;
  addIncomeSource: (params: {
    name: string;
    type: "primary" | "side";
    amount: number;
    applyDeductions: boolean;
  }) => Promise<unknown>;
  updateIncomeSource: (
    id: string,
    params: {
      name: string;
      type: "primary" | "side";
      amount: number;
      applyDeductions: boolean;
    }
  ) => Promise<unknown>;
  recalculateBudget: () => Promise<void>;
  reload: () => Promise<void>;
};

export type BudgetPreferenceBootstrapInput = {
  isCancelled: () => boolean;
  /** Prevents overlapping runs (e.g. Strict Mode / rapid dep changes). */
  inFlightRef: { current: boolean };
  userId: string | null | undefined;
  profileLoading: boolean;
  vitals: ProfileVitals | null;
  budgetLoading: boolean;
  pendingCount: number;
  state: BudgetState | null;
} & BudgetPreferenceBootstrapFns;

/**
 * Single evaluation of “should we auto-create the first cycle from vitals?”
 * Extracted for exhaustive unit tests without mounting React.
 */
export async function runBudgetPreferenceBootstrapCore(
  input: BudgetPreferenceBootstrapInput
): Promise<"skipped" | "completed" | "error"> {
  const {
    isCancelled,
    inFlightRef,
    userId,
    profileLoading,
    vitals,
    budgetLoading,
    pendingCount,
    state,
    setupBudget,
    addIncomeSource,
    updateIncomeSource,
    recalculateBudget,
    reload,
  } = input;

  if (!userId || budgetLoading || profileLoading) return "skipped";
  if (!vitals?.setup_completed) return "skipped";
  if (pendingCount > 0) return "skipped";
  const cycles = state?.cycles ?? [];
  if (cycles.length !== 0) return "skipped";
  if (!hasMeaningfulPreferenceSignals(vitals)) return "skipped";
  if (vitals.stable_salary <= 0) return "skipped";

  const payday = vitals.payday_day ?? state?.prefs?.paydayDay ?? null;
  if (
    payday === null ||
    !Number.isFinite(payday) ||
    payday < 1 ||
    payday > 31
  ) {
    return "skipped";
  }

  if (inFlightRef.current) return "skipped";
  inFlightRef.current = true;
  try {
    const allocation = computeIntelligentAllocationFromProfile(vitals);
    const existingPrimary = state?.incomeSources?.find(
      (s) => s.type === "primary"
    );
    if (existingPrimary) {
      await updateIncomeSource(existingPrimary.id, {
        name: existingPrimary.name || "Primary income",
        type: "primary",
        amount: vitals.stable_salary,
        applyDeductions: vitals.auto_tax,
      });
    } else {
      await addIncomeSource({
        name: "Primary income",
        type: "primary",
        amount: vitals.stable_salary,
        applyDeductions: vitals.auto_tax,
      });
    }
    if (isCancelled()) return "skipped";
    await setupBudget({
      paydayDay: payday,
      needsPct: allocation.needsPct,
      wantsPct: allocation.wantsPct,
      savingsPct: allocation.savingsPct,
      interests: vitals.interests,
      seedCategories: true,
      lifeStage: vitals.life_stage ?? null,
    });
    if (isCancelled()) return "skipped";
    await recalculateBudget();
    await reload();
    return "completed";
  } catch (e) {
    console.error("[Budget] Auto-setup from preferences failed", e);
    return "error";
  } finally {
    inFlightRef.current = false;
  }
}
