/**
 * Migration modal: when to show and what payload to render.
 */

import type { BudgetCycle } from "@/types/budget";
import { computeIntelligentAllocationFromProfile } from "@/utils/budgetFromPreferences";
import type { ProfileVitals } from "@/utils/profileVitals";
import { resolveBudgetPreferenceMigrationPrompt } from "@/utils/budgetPreferenceMigrationPromptCore";

function vitals(over: Partial<ProfileVitals> = {}): ProfileVitals {
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
    life_stage: "family",
    spending_style: "moderate",
    financial_priority: "balanced",
    income_frequency: "monthly",
    dependents_count: 0,
    profile_version: 1,
    ...over,
  };
}

const cEarly: BudgetCycle = {
  id: "old",
  userId: "u1",
  startDate: "2025-06-01",
  endDate: "2025-06-30",
  paydayDay: 25,
  needsPct: 0.5,
  wantsPct: 0.3,
  savingsPct: 0.2,
  rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
  reallocationApplied: false,
  createdAt: "",
  updatedAt: "",
};

const cLatest: BudgetCycle = {
  id: "new",
  userId: "u1",
  startDate: "2026-02-01",
  endDate: "2026-02-28",
  paydayDay: 25,
  needsPct: 0.9,
  wantsPct: 0.05,
  savingsPct: 0.05,
  rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
  reallocationApplied: false,
  createdAt: "",
  updatedAt: "",
};

describe("resolveBudgetPreferenceMigrationPrompt", () => {
  const neverSkipped = jest.fn().mockResolvedValue(false);

  beforeEach(() => {
    neverSkipped.mockClear();
    neverSkipped.mockResolvedValue(false);
  });

  it("returns null when userId missing", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: null,
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 0,
        cycles: [cLatest],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
    expect(neverSkipped).not.toHaveBeenCalled();
  });

  it("returns null while loading", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: true,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 0,
        cycles: [cLatest],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
  });

  it("returns null when setup_completed is false", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals({ setup_completed: false }),
        pendingCount: 0,
        cycles: [cLatest],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
  });

  it("returns null when pendingCount > 0", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 1,
        cycles: [cLatest],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
  });

  it("returns null when modalAlreadyOpen", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 0,
        cycles: [cLatest],
        modalAlreadyOpen: true,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
    expect(neverSkipped).not.toHaveBeenCalled();
  });

  it("returns null when no cycles", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 0,
        cycles: [],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
  });

  it("uses latest cycle by startDate (not first array element)", async () => {
    const skipped = jest.fn().mockResolvedValue(false);
    const payload = await resolveBudgetPreferenceMigrationPrompt({
      userId: "u1",
      budgetLoading: false,
      profileLoading: false,
      vitals: vitals(),
      pendingCount: 0,
      cycles: [cEarly, cLatest],
      modalAlreadyOpen: false,
      isCancelled: () => false,
      isMigrationSkipped: skipped,
    });
    expect(payload).not.toBeNull();
    expect(skipped).toHaveBeenCalledWith("u1", "new");
    expect(payload!.cycleId).toBe("new");
  });

  it("returns null when AsyncStorage skip flag is set", async () => {
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: vitals(),
        pendingCount: 0,
        cycles: [cLatest],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: jest.fn().mockResolvedValue(true),
      })
    ).resolves.toBeNull();
  });

  it("returns null when suggestion matches cycle within tolerance", async () => {
    const v = vitals();
    const suggested = computeIntelligentAllocationFromProfile(v);
    const aligned: BudgetCycle = {
      ...cLatest,
      needsPct: suggested.needsPct,
      wantsPct: suggested.wantsPct,
      savingsPct: suggested.savingsPct,
    };
    await expect(
      resolveBudgetPreferenceMigrationPrompt({
        userId: "u1",
        budgetLoading: false,
        profileLoading: false,
        vitals: v,
        pendingCount: 0,
        cycles: [aligned],
        modalAlreadyOpen: false,
        isCancelled: () => false,
        isMigrationSkipped: neverSkipped,
      })
    ).resolves.toBeNull();
  });

  it("returns payload when cycle differs strongly from profile-based suggestion", async () => {
    const payload = await resolveBudgetPreferenceMigrationPrompt({
      userId: "u1",
      budgetLoading: false,
      profileLoading: false,
      vitals: vitals(),
      pendingCount: 0,
      cycles: [cLatest],
      modalAlreadyOpen: false,
      isCancelled: () => false,
      isMigrationSkipped: neverSkipped,
    });
    expect(payload).not.toBeNull();
    expect(payload!.current.needsPct).toBe(0.9);
    expect(payload!.suggested.needsPct + payload!.suggested.wantsPct + payload!.suggested.savingsPct).toBeCloseTo(
      1,
      5
    );
    expect(payload!.lifeStagePhrase).toBe("family");
    expect(payload!.financialPriorityPhrase).toBe("balanced");
  });

  it("returns null when cancelled before skip check completes", async () => {
    jest.useFakeTimers();
    let cancelled = false;
    const slowSkip = jest.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 50);
        })
    );
    const p = resolveBudgetPreferenceMigrationPrompt({
      userId: "u1",
      budgetLoading: false,
      profileLoading: false,
      vitals: vitals(),
      pendingCount: 0,
      cycles: [cLatest],
      modalAlreadyOpen: false,
      isCancelled: () => cancelled,
      isMigrationSkipped: slowSkip,
    });
    await Promise.resolve();
    cancelled = true;
    await jest.runAllTimersAsync();
    await expect(p).resolves.toBeNull();
    jest.useRealTimers();
  });
});
