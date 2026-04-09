/**
 * Budget preference → allocation mapping (re-compute engine inputs).
 */

import type { BudgetCycle } from "@/types/budget";
import type { ProfileVitals } from "@/utils/profileVitals";
import {
  computeIntelligentAllocationFromProfile,
  hasMeaningfulPreferenceSignals,
  preferencesDifferSignificantlyFromCycle,
  profileFinancialPriorityPhrase,
  profileLifeStagePhrase,
} from "@/utils/budgetFromPreferences";

function baseVitals(over: Partial<ProfileVitals> = {}): ProfileVitals {
  return {
    setup_completed: true,
    payday_day: 25,
    interests: [],
    stable_salary: 5000,
    auto_tax: false,
    side_income: 0,
    rent: 0,
    tithe_remittance: 0,
    debt_obligations: 0,
    utilities_mode: "general",
    utilities_total: 0,
    utilities_ecg: 0,
    utilities_water: 0,
    primary_goal: null,
    strategy: "balanced",
    needs_pct: 0.5,
    wants_pct: 0.3,
    savings_pct: 0.2,
    life_stage: null,
    spending_style: null,
    financial_priority: null,
    income_frequency: "monthly",
    dependents_count: 0,
    profile_version: 1,
    ...over,
  };
}

function cycle(
  needsPct: number,
  wantsPct: number,
  savingsPct: number,
  over: Partial<BudgetCycle> = {}
): BudgetCycle {
  return {
    id: "c1",
    userId: "u1",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    paydayDay: 25,
    needsPct,
    wantsPct,
    savingsPct,
    rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
    reallocationApplied: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("profileLifeStagePhrase", () => {
  it.each([
    [null, "current"],
    ["student", "student"],
    ["young_professional", "young professional"],
    ["family", "family"],
    ["retiree", "retiree"],
  ] as const)("%s → %s", (stage, expected) => {
    expect(profileLifeStagePhrase(stage)).toBe(expected);
  });
});

describe("profileFinancialPriorityPhrase", () => {
  it.each([
    [null, "balanced"],
    ["balanced", "balanced"],
    ["debt_payoff", "debt payoff"],
    ["savings_growth", "savings growth"],
    ["lifestyle", "lifestyle"],
  ] as const)("%s → %s", (p, expected) => {
    expect(profileFinancialPriorityPhrase(p)).toBe(expected);
  });
});

describe("hasMeaningfulPreferenceSignals", () => {
  it("is false for all-default legacy profile (pre–Track 1 style)", () => {
    expect(
      hasMeaningfulPreferenceSignals(
        baseVitals({
          life_stage: null,
          spending_style: null,
          financial_priority: null,
          income_frequency: "monthly",
          dependents_count: 0,
        })
      )
    ).toBe(false);
  });

  it("is true when life_stage is set", () => {
    expect(hasMeaningfulPreferenceSignals(baseVitals({ life_stage: "family" }))).toBe(
      true
    );
  });

  it("is true when spending_style is set", () => {
    expect(
      hasMeaningfulPreferenceSignals(baseVitals({ spending_style: "conservative" }))
    ).toBe(true);
  });

  it("is true when financial_priority is set", () => {
    expect(
      hasMeaningfulPreferenceSignals(
        baseVitals({ financial_priority: "debt_payoff" })
      )
    ).toBe(true);
  });

  it("is true when income_frequency is not monthly", () => {
    expect(
      hasMeaningfulPreferenceSignals(baseVitals({ income_frequency: "weekly" }))
    ).toBe(true);
  });

  it("is true when dependents_count > 0", () => {
    expect(hasMeaningfulPreferenceSignals(baseVitals({ dependents_count: 1 }))).toBe(
      true
    );
  });
});

describe("computeIntelligentAllocationFromProfile", () => {
  it("returns fractions that sum to ~1 for extended profile", () => {
    const v = baseVitals({
      life_stage: "young_professional",
      spending_style: "moderate",
      financial_priority: "savings_growth",
      stable_salary: 6000,
      utilities_total: 500,
    });
    const a = computeIntelligentAllocationFromProfile(v);
    expect(a.needsPct).toBeGreaterThanOrEqual(0);
    expect(a.wantsPct).toBeGreaterThanOrEqual(0);
    expect(a.savingsPct).toBeGreaterThanOrEqual(0);
    const sum = a.needsPct + a.wantsPct + a.savingsPct;
    expect(sum).toBeGreaterThan(0.999);
    expect(sum).toBeLessThan(1.001);
  });

  it("returns valid split for bare prefs (legacy path inside engine)", () => {
    const v = baseVitals({
      life_stage: null,
      spending_style: null,
      financial_priority: null,
      stable_salary: 4000,
      utilities_total: 2000,
    });
    const a = computeIntelligentAllocationFromProfile(v);
    const sum = a.needsPct + a.wantsPct + a.savingsPct;
    expect(sum).toBeGreaterThan(0.999);
    expect(sum).toBeLessThan(1.001);
  });
});

describe("preferencesDifferSignificantlyFromCycle", () => {
  it("returns false when all buckets within 5 percentage points (0.05 fraction)", () => {
    const v = baseVitals({ life_stage: "family", financial_priority: "balanced" });
    const suggested = computeIntelligentAllocationFromProfile(v);
    const c = cycle(
      suggested.needsPct + 0.04,
      suggested.wantsPct - 0.02,
      suggested.savingsPct - 0.02
    );
    expect(preferencesDifferSignificantlyFromCycle(v, c)).toBe(false);
  });

  it("returns true when any bucket differs by more than 5 percentage points", () => {
    const v = baseVitals({ life_stage: "family", financial_priority: "balanced" });
    const suggested = computeIntelligentAllocationFromProfile(v);
    const c = cycle(
      suggested.needsPct + 0.06,
      suggested.wantsPct,
      suggested.savingsPct - 0.06
    );
    expect(preferencesDifferSignificantlyFromCycle(v, c)).toBe(true);
  });
});
