import { calculateSavingsGoal } from "../savings-goal";

describe("calculateSavingsGoal", () => {
  it("computes months when target and monthly contribution given", () => {
    const result = calculateSavingsGoal({
      targetAmount: 6000,
      monthlyContribution: 500,
    });
    expect(result.monthsToGoal).toBe(12);
    expect(result.totalContributed).toBe(6000);
  });

  it("computes monthly contribution when target and months given", () => {
    const result = calculateSavingsGoal({
      targetAmount: 6000,
      monthsToGoal: 12,
    });
    expect(result.monthlyContribution).toBe(500);
  });

  it("handles interest in months calculation", () => {
    const result = calculateSavingsGoal({
      targetAmount: 6000,
      monthlyContribution: 500,
      annualInterestRate: 0.24,
    });
    expect(result.monthsToGoal).toBeLessThanOrEqual(12);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it("returns zeros when insufficient input", () => {
    const result = calculateSavingsGoal({
      targetAmount: 0,
      monthlyContribution: 100,
    });
    expect(result.monthsToGoal).toBe(0);
    expect(result.finalAmount).toBe(0);
  });
});
