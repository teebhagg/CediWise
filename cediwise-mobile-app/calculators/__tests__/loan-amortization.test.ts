import { calculateLoanAmortization } from "../loan-amortization";

describe("calculateLoanAmortization", () => {
  it("calculates monthly payment for standard loan", () => {
    const result = calculateLoanAmortization({
      principal: 10000,
      annualInterestRate: 0.12,
      termMonths: 12,
    });
    expect(result.monthlyPayment).toBeGreaterThan(888);
    expect(result.monthlyPayment).toBeLessThan(890);
    expect(result.schedule).toHaveLength(12);
  });

  it("total payment equals principal + interest", () => {
    const result = calculateLoanAmortization({
      principal: 5000,
      annualInterestRate: 0.1,
      termMonths: 6,
    });
    expect(result.totalPayment).toBeCloseTo(5000 + result.totalInterest, 1);
  });
});
