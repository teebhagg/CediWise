/**
 * First-cycle auto-setup from profile vitals (app bootstrap).
 */

import type { BudgetState } from "@/types/budget";
import type { ProfileVitals } from "@/utils/profileVitals";
import { runBudgetPreferenceBootstrapCore } from "@/utils/budgetPreferenceBootstrapCore";

function vitals(over: Partial<ProfileVitals> = {}): ProfileVitals {
  return {
    setup_completed: true,
    payday_day: 25,
    interests: ["Food"],
    stable_salary: 5000,
    auto_tax: true,
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
    life_stage: "young_professional",
    spending_style: "moderate",
    financial_priority: "balanced",
    income_frequency: "monthly",
    dependents_count: 0,
    profile_version: 1,
    ...over,
  };
}

const emptyState = (over: Partial<BudgetState> = {}): BudgetState => ({
  version: 1,
  userId: "u1",
  updatedAt: "2026-01-01T00:00:00.000Z",
  prefs: { paydayDay: 25, interests: [] },
  cycles: [],
  categories: [],
  incomeSources: [],
  transactions: [],
  ...over,
});

describe("runBudgetPreferenceBootstrapCore", () => {
  const noopFns = () => ({
    setupBudget: jest.fn().mockResolvedValue(undefined),
    addIncomeSource: jest.fn().mockResolvedValue(undefined),
    updateIncomeSource: jest.fn().mockResolvedValue(undefined),
    recalculateBudget: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
  });

  it("skips when userId is missing", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: null,
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("skips while budget or profile is loading", async () => {
    const fns = noopFns();
    expect(
      await runBudgetPreferenceBootstrapCore({
        isCancelled: () => false,
        inFlightRef: { current: false },
        userId: "u1",
        profileLoading: true,
        vitals: vitals(),
        budgetLoading: false,
        pendingCount: 0,
        state: emptyState(),
        ...fns,
      })
    ).toBe("skipped");
    expect(
      await runBudgetPreferenceBootstrapCore({
        isCancelled: () => false,
        inFlightRef: { current: false },
        userId: "u1",
        profileLoading: false,
        vitals: vitals(),
        budgetLoading: true,
        pendingCount: 0,
        state: emptyState(),
        ...fns,
      })
    ).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("skips when setup_completed is false", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals({ setup_completed: false }),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("skips when pendingCount > 0", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 3,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
  });

  it("skips when cycles already exist", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState({
        cycles: [
          {
            id: "c1",
            userId: "u1",
            startDate: "2026-01-01",
            endDate: "2026-01-31",
            paydayDay: 25,
            needsPct: 0.5,
            wantsPct: 0.3,
            savingsPct: 0.2,
            rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
            reallocationApplied: false,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
      ...fns,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("skips pre–Track 1 style profile (no meaningful preference signals)", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals({
        life_stage: null,
        spending_style: null,
        financial_priority: null,
        income_frequency: "monthly",
        dependents_count: 0,
      }),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("skips when stable_salary <= 0", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals({ stable_salary: 0 }),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
  });

  it.each([
    [null as unknown as number],
    [Number.NaN],
    [0],
    [32],
  ])("skips when payday invalid (%p)", async (payday) => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals({ payday_day: payday as number | null }),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState({ prefs: { interests: [] } }),
      ...fns,
    });
    expect(r).toBe("skipped");
  });

  it("uses prefs.paydayDay when vitals.payday_day is null", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals({ payday_day: null }),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState({ prefs: { paydayDay: 15, interests: [] } }),
      ...fns,
    });
    expect(r).toBe("completed");
    expect(fns.setupBudget).toHaveBeenCalledWith(
      expect.objectContaining({ paydayDay: 15 })
    );
  });

  it("completed path: addIncomeSource when no primary, then setupBudget + recalc + reload", async () => {
    const fns = noopFns();
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("completed");
    expect(fns.addIncomeSource).toHaveBeenCalledWith({
      name: "Primary income",
      type: "primary",
      amount: 5000,
      applyDeductions: true,
    });
    expect(fns.updateIncomeSource).not.toHaveBeenCalled();
    expect(fns.setupBudget).toHaveBeenCalledTimes(1);
    const call = fns.setupBudget.mock.calls[0][0];
    expect(call.paydayDay).toBe(25);
    expect(call.seedCategories).toBe(true);
    expect(call.interests).toEqual(["Food"]);
    expect(call.needsPct! + call.wantsPct! + call.savingsPct!).toBeCloseTo(1, 5);
    expect(fns.recalculateBudget).toHaveBeenCalled();
    expect(fns.reload).toHaveBeenCalled();
  });

  it("completed path: updateIncomeSource when primary exists", async () => {
    const fns = noopFns();
    await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState({
        incomeSources: [
          {
            id: "inc1",
            userId: "u1",
            name: "Job",
            type: "primary",
            amount: 100,
            applyDeductions: false,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
      ...fns,
    });
    expect(fns.updateIncomeSource).toHaveBeenCalledWith("inc1", {
      name: "Job",
      type: "primary",
      amount: 5000,
      applyDeductions: true,
    });
    expect(fns.addIncomeSource).not.toHaveBeenCalled();
  });

  it("returns skipped after cancel before setupBudget (still updates income)", async () => {
    const fns = noopFns();
    let cancelled = false;
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => cancelled,
      inFlightRef: { current: false },
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      addIncomeSource: jest.fn().mockImplementation(async () => {
        cancelled = true;
      }),
      updateIncomeSource: fns.updateIncomeSource,
      setupBudget: fns.setupBudget,
      recalculateBudget: fns.recalculateBudget,
      reload: fns.reload,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });

  it("returns error and releases inFlight when setupBudget throws", async () => {
    const logErr = jest.spyOn(console, "error").mockImplementation(() => {});
    const fns = noopFns();
    fns.setupBudget.mockRejectedValueOnce(new Error("boom"));
    const ref = { current: false };
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: ref,
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("error");
    expect(ref.current).toBe(false);
    logErr.mockRestore();
  });

  it("does not start second run while inFlight", async () => {
    const fns = noopFns();
    const ref = { current: true };
    const r = await runBudgetPreferenceBootstrapCore({
      isCancelled: () => false,
      inFlightRef: ref,
      userId: "u1",
      profileLoading: false,
      vitals: vitals(),
      budgetLoading: false,
      pendingCount: 0,
      state: emptyState(),
      ...fns,
    });
    expect(r).toBe("skipped");
    expect(fns.setupBudget).not.toHaveBeenCalled();
  });
});
