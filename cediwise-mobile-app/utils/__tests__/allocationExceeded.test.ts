import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
  IncomeSource,
} from "../../types/budget";
import { checkCategoryLimitImpact } from "../allocationExceeded";

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

function makeCategory(
  bucket: BudgetBucket,
  limitAmount: number,
  cycleId: string,
  id?: string
): BudgetCategory {
  return {
    id: id ?? `cat-${bucket}-${limitAmount}`,
    userId: "u1",
    cycleId,
    bucket,
    name: "Category",
    limitAmount,
    isCustom: false,
    sortOrder: 0,
    isArchived: false,
    manualOverride: false,
    createdAt: "",
    updatedAt: "",
  };
}

function makeIncomeSource(overrides: Partial<IncomeSource>): IncomeSource {
  return {
    id: "inc1",
    userId: "u1",
    name: "Salary",
    type: "primary",
    amount: 1000,
    applyDeductions: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("checkCategoryLimitImpact", () => {
  const cycle = makeCycle();
  const incomeSources: IncomeSource[] = [makeIncomeSource({ amount: 1000, applyDeductions: false })];
  // monthlyNetIncome = 1000, needs = 500, wants = 300, savings = 200

  it("returns no exceed when new limit fits within bucket and income", () => {
    const result = checkCategoryLimitImpact({
      cycle,
      categories: [],
      incomeSources,
      bucket: "needs",
      newLimit: 100,
    });
    expect(result.exceedsBucket).toBe(false);
    expect(result.exceedsIncome).toBe(false);
    expect(result.bucketTotal).toBe(500);
    expect(result.currentCategoryLimitSum).toBe(100);
    expect(result.remainder).toBe(0);
    expect(result.debtAmount).toBe(0);
    expect(result.message).toBe("");
  });

  it("returns exceedsBucket when new limit exceeds bucket total", () => {
    const result = checkCategoryLimitImpact({
      cycle,
      categories: [],
      incomeSources,
      bucket: "needs",
      newLimit: 600,
    });
    expect(result.exceedsBucket).toBe(true);
    expect(result.remainder).toBe(100);
    expect(result.bucketTotal).toBe(500);
    expect(result.currentCategoryLimitSum).toBe(600);
  });

  it("returns exceedsIncome when total budget would exceed monthly net income", () => {
    const categories: BudgetCategory[] = [
      makeCategory("needs", 400, cycle.id),
      makeCategory("wants", 300, cycle.id),
      makeCategory("savings", 200, cycle.id),
    ];
    const result = checkCategoryLimitImpact({
      cycle,
      categories,
      incomeSources,
      bucket: "needs",
      newLimit: 200, // total would be 400+300+200+200 = 1100 > 1000
    });
    expect(result.exceedsIncome).toBe(true);
    expect(result.debtAmount).toBe(100);
    expect(result.message).toBe("Budget exceeds income. Debt will occur.");
  });

  it("uses IncomeSource with applyDeductions for net income (primary)", () => {
    const withDeductions: IncomeSource[] = [
      makeIncomeSource({ amount: 1000, applyDeductions: true }),
    ];
    const result = checkCategoryLimitImpact({
      cycle,
      categories: [],
      incomeSources: withDeductions,
      bucket: "needs",
      newLimit: 400,
    });
    expect(result.bucketTotal).toBeLessThan(500); // net < 1000 so needs < 500
    expect(result.exceedsBucket).toBe(false);
  });

  it("excludes categoryId from current sum when updating existing category", () => {
    const categories: BudgetCategory[] = [
      makeCategory("needs", 300, cycle.id, "cat1"),
      makeCategory("needs", 100, cycle.id, "cat2"),
    ];
    const result = checkCategoryLimitImpact({
      cycle,
      categories,
      incomeSources,
      bucket: "needs",
      newLimit: 150,
      categoryId: "cat2",
    });
    // Current sum for needs excluding cat2: 300. With newLimit 150 -> 300+150=450, bucket=500, no exceed
    expect(result.currentCategoryLimitSum).toBe(450);
    expect(result.exceedsBucket).toBe(false);
  });

  it("suggests allocation when bucket exceeded but income not", () => {
    const result = checkCategoryLimitImpact({
      cycle,
      categories: [],
      incomeSources,
      bucket: "needs",
      newLimit: 600,
    });
    expect(result.exceedsBucket).toBe(true);
    expect(result.exceedsIncome).toBe(false);
    expect(result.suggestedAllocation).not.toBeNull();
    expect(result.suggestedAllocation?.needsPct).toBeGreaterThan(0.5);
    expect(result.suggestedAllocation?.wantsPct).toBeLessThan(0.3);
  });
});
