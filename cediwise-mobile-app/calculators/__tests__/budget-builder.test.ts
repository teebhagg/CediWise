import { calculateBudget } from "../budget-builder";

describe("calculateBudget", () => {
  it("uses 50/30/20 by default", () => {
    const result = calculateBudget({ monthlyIncome: 2000 });
    expect(result.needsAmount).toBe(1000);
    expect(result.wantsAmount).toBe(600);
    expect(result.savingsAmount).toBe(400);
    expect(result.needsPct).toBe(0.5);
    expect(result.wantsPct).toBe(0.3);
    expect(result.savingsPct).toBe(0.2);
  });

  it("handles custom allocation", () => {
    const result = calculateBudget({
      monthlyIncome: 3000,
      allocation: { needsPct: 0.6, wantsPct: 0.2, savingsPct: 0.2 },
    });
    expect(result.needsAmount).toBe(1800);
    expect(result.wantsAmount).toBe(600);
    expect(result.savingsAmount).toBe(600);
  });

  it("normalizes allocation that does not sum to 1", () => {
    const result = calculateBudget({
      monthlyIncome: 1000,
      allocation: { needsPct: 0.5, wantsPct: 0.5, savingsPct: 0.5 },
    });
    const sum = result.needsPct + result.wantsPct + result.savingsPct;
    expect(sum).toBeCloseTo(1);
    const total =
      result.needsAmount + result.wantsAmount + result.savingsAmount;
    expect(total).toBeCloseTo(1000, 1);
  });

  it("handles zero income", () => {
    const result = calculateBudget({ monthlyIncome: 0 });
    expect(result.needsAmount).toBe(0);
    expect(result.wantsAmount).toBe(0);
    expect(result.savingsAmount).toBe(0);
  });
});
