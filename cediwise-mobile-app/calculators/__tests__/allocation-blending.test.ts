/**
 * Phase 1.2: Unit tests for allocation blending (blendAllocation, getHistoricalAvgByCategory)
 */
import type { BudgetState } from "../../types/budget";
import {
  blendAllocation,
  getHistoricalAvgByCategory,
} from "../../utils/allocationBlending";

describe("blendAllocation", () => {
  it("returns template when no user data", () => {
    expect(blendAllocation(500, null, 0, 0)).toBe(500);
    expect(blendAllocation(500, null, 10, 1)).toBe(500);
  });

  it("returns template when cycleCount < 2", () => {
    expect(blendAllocation(500, 400, 20, 1)).toBe(500);
  });

  it("returns blended limit when confidence sufficient", () => {
    const template = 500;
    const userAvg = 400;
    const blended = blendAllocation(template, userAvg, 20, 4);
    expect(blended).toBeGreaterThan(400);
    expect(blended).toBeLessThan(500);
  });

  it("returns template when userAvgSpent <= 0", () => {
    expect(blendAllocation(500, 0, 20, 4)).toBe(500);
  });
});

describe("getHistoricalAvgByCategory", () => {
  const mockState: BudgetState = {
    version: 1,
    userId: "u1",
    prefs: { paydayDay: 25 },
    incomeSources: [],
    cycles: [
      {
        id: "c1",
        userId: "u1",
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        paydayDay: 25,
        needsPct: 0.5,
        wantsPct: 0.3,
        savingsPct: 0.2,
        rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
        reallocationApplied: false,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "c2",
        userId: "u1",
        startDate: "2025-02-01",
        endDate: "2025-02-28",
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
    categories: [
      {
        id: "cat1",
        userId: "u1",
        cycleId: "c1",
        bucket: "needs",
        name: "Rent",
        limitAmount: 2000,
        isCustom: false,
        sortOrder: 0,
        isArchived: false,
        manualOverride: false,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "cat2",
        userId: "u1",
        cycleId: "c2",
        bucket: "needs",
        name: "Rent",
        limitAmount: 2000,
        isCustom: false,
        sortOrder: 0,
        isArchived: false,
        manualOverride: false,
        createdAt: "",
        updatedAt: "",
      },
    ],
    transactions: [
      {
        id: "t1",
        userId: "u1",
        cycleId: "c1",
        bucket: "needs",
        categoryId: "cat1",
        amount: 1900,
        occurredAt: "",
        source: "manual",
        createdAt: "",
      },
      {
        id: "t2",
        userId: "u1",
        cycleId: "c2",
        bucket: "needs",
        categoryId: "cat2",
        amount: 2100,
        occurredAt: "",
        source: "manual",
        createdAt: "",
      },
    ],
    updatedAt: "",
  };

  it("returns empty map when fewer than 2 cycles", () => {
    const singleCycle: BudgetState = {
      ...mockState,
      cycles: mockState.cycles.slice(0, 1),
      categories: mockState.categories.filter((c) => c.cycleId === "c1"),
      transactions: mockState.transactions.filter((t) => t.cycleId === "c1"),
    };
    const hist = getHistoricalAvgByCategory(singleCycle);
    expect(hist.size).toBe(0);
  });

  it("computes avg and variance for categories with 2+ cycles", () => {
    const hist = getHistoricalAvgByCategory(mockState);
    expect(hist.size).toBeGreaterThan(0);
    const rent = hist.get("needs:Rent");
    expect(rent).toBeDefined();
    expect(rent!.avgSpent).toBe(2000);
    expect(rent!.cycleCount).toBe(2);
    expect(rent!.variance).toBeGreaterThanOrEqual(0);
  });

  it("excludes cycle when excludeCycleId provided", () => {
    const hist = getHistoricalAvgByCategory(mockState, "c2");
    expect(hist.size).toBe(0);
  });
});
