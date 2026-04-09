import { computeIntelligentStrategy } from "@/components/features/vitals/utils";
import type {
  BudgetCycle,
  FinancialPriority,
  LifeStage,
} from "@/types/budget";
import type { ProfileVitals } from "@/utils/profileVitals";

export function profileLifeStagePhrase(stage: LifeStage | null): string {
  if (!stage) return "current";
  const map: Record<LifeStage, string> = {
    student: "student",
    young_professional: "young professional",
    family: "family",
    retiree: "retiree",
  };
  return map[stage];
}

export function profileFinancialPriorityPhrase(
  priority: FinancialPriority | null
): string {
  if (!priority) return "balanced";
  const map: Record<FinancialPriority, string> = {
    debt_payoff: "debt payoff",
    savings_growth: "savings growth",
    lifestyle: "lifestyle",
    balanced: "balanced",
  };
  return map[priority];
}

/** True when profile has non-default preference signals that should drive the budget engine. */
export function hasMeaningfulPreferenceSignals(profile: ProfileVitals): boolean {
  return (
    profile.life_stage !== null ||
    profile.spending_style !== null ||
    profile.financial_priority !== null ||
    profile.income_frequency !== "monthly" ||
    profile.dependents_count > 0
  );
}

/**
 * Uses the same engine as the vitals wizard so allocations stay consistent.
 * Percents are 0..1 and sum to 1 from the underlying engine.
 */
export function computeIntelligentAllocationFromProfile(
  profile: ProfileVitals
): { needsPct: number; wantsPct: number; savingsPct: number } {
  const result = computeIntelligentStrategy({
    stableSalary: profile.stable_salary,
    autoTax: profile.auto_tax,
    sideIncome: profile.side_income,
    rent: profile.rent,
    titheRemittance: profile.tithe_remittance,
    debtObligations: profile.debt_obligations,
    utilitiesTotal: profile.utilities_total,
    lifeStage: profile.life_stage,
    dependentsCount: profile.dependents_count,
    incomeFrequency: profile.income_frequency,
    spendingStyle: profile.spending_style,
    financialPriority: profile.financial_priority,
  });
  return {
    needsPct: result.needsPct,
    wantsPct: result.wantsPct,
    savingsPct: result.savingsPct,
  };
}

/** Any bucket differs by more than 5 percentage points (comparing 0..1 fractions). */
export function preferencesDifferSignificantlyFromCycle(
  profile: ProfileVitals,
  activeCycle: BudgetCycle
): boolean {
  const suggested = computeIntelligentAllocationFromProfile(profile);
  return (
    Math.abs(suggested.needsPct - activeCycle.needsPct) > 0.05 ||
    Math.abs(suggested.wantsPct - activeCycle.wantsPct) > 0.05 ||
    Math.abs(suggested.savingsPct - activeCycle.savingsPct) > 0.05
  );
}
