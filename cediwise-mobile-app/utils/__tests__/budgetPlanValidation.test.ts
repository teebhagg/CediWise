import type { BudgetCategory, BudgetCycle, IncomeSource } from "../../types/budget";
import {
  computeBucketEnvelopes,
  hasCategoryAllocationExceeded,
  isPlanOverTakeHomePay,
  validateBudgetPlan,
} from "../budgetPlanValidation";

function makeCycle(overrides?: Partial<BudgetCycle>): BudgetCycle {
  return {
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
    ...overrides,
  };
}

function makeIncome(amount: number): IncomeSource[] {
  return [
    {
      id: "inc1",
      userId: "u1",
      name: "Salary",
      type: "primary",
      amount,
      applyDeductions: false,
      createdAt: "",
      updatedAt: "",
    },
  ];
}

function makeCat(
  bucket: BudgetCategory["bucket"],
  limitAmount: number,
  manualOverride = false,
): Pick<BudgetCategory, "bucket" | "limitAmount" | "manualOverride"> {
  return { bucket, limitAmount, manualOverride };
}

describe("computeBucketEnvelopes", () => {
  it("splits take-home by cycle percentages", () => {
    const env = computeBucketEnvelopes(3000, makeCycle());
    expect(env.needs).toBe(1500);
    expect(env.wants).toBe(900);
    expect(env.savings).toBe(600);
  });
});

describe("validateBudgetPlan", () => {
  const cycle = makeCycle();
  const income = makeIncome(3000);

  it("passes when totals fit within envelopes and take-home", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 1400),
        makeCat("wants", 800),
        makeCat("savings", 600),
      ],
      incomeSources: income,
    });
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.takeHome).toBe(3000);
  });

  it("flags L2 when a bucket exceeds its envelope beyond tolerance", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [makeCat("needs", 1600), makeCat("wants", 900), makeCat("savings", 600)],
      incomeSources: income,
      tolerance: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.type === "L2" && v.bucket === "needs")).toBe(
      true,
    );
  });

  it("flags L3 when total planned exceeds take-home beyond tolerance", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 1500),
        makeCat("wants", 900),
        makeCat("savings", 700),
      ],
      incomeSources: income,
      tolerance: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.type === "L3")).toBe(true);
  });

  it("flags L4 when locked obligations exceed take-home", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 3200, true),
        makeCat("wants", 0),
        makeCat("savings", 0),
      ],
      incomeSources: income,
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.type === "L4")).toBe(true);
  });

  it("allows bucket overflow within ₵20 tolerance", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 1510),
        makeCat("wants", 890),
        makeCat("savings", 600),
      ],
      incomeSources: income,
      tolerance: 20,
    });
    expect(result.valid).toBe(true);
  });
});

describe("isPlanOverTakeHomePay", () => {
  const cycle = makeCycle();
  const income = makeIncome(3000);

  it("returns true for L3 over take-home", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 1500),
        makeCat("wants", 900),
        makeCat("savings", 700),
      ],
      incomeSources: income,
      tolerance: 20,
    });
    expect(isPlanOverTakeHomePay(result)).toBe(true);
  });

  it("returns false when within take-home", () => {
    const result = validateBudgetPlan({
      cycle,
      categories: [
        makeCat("needs", 1400),
        makeCat("wants", 800),
        makeCat("savings", 600),
      ],
      incomeSources: income,
    });
    expect(isPlanOverTakeHomePay(result)).toBe(false);
    expect(hasCategoryAllocationExceeded(result)).toBe(false);
  });
});
