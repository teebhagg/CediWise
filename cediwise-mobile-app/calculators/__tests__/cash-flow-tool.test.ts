import { calculateCashFlow } from "../cash-flow-tool";

describe("calculateCashFlow", () => {
  it("calculates net cash flow", () => {
    const result = calculateCashFlow({
      monthlyIncome: 5000,
      fixedExpenses: 2000,
      variableExpensePct: 0.2,
      months: 3,
    });
    expect(result.monthlyProjection).toHaveLength(3);
    expect(result.averageMonthlyNet).toBe(2000);
    expect(result.totalNetOverPeriod).toBe(6000);
  });

  it("handles zero variable expenses", () => {
    const result = calculateCashFlow({
      monthlyIncome: 3000,
      fixedExpenses: 1000,
      variableExpensePct: 0,
      months: 1,
    });
    expect(result.monthlyProjection[0].netCashFlow).toBe(2000);
  });
});
