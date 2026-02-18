import { calculateTbillProjection } from "../tbill-simulator";

describe("calculateTbillProjection", () => {
  it("calculates interest for 91-day T-Bill", () => {
    const result = calculateTbillProjection({
      principal: 10000,
      annualRate: 0.25,
      tenorDays: 91,
    });
    expect(result.interestEarned).toBeGreaterThan(0);
    expect(result.maturityAmount).toBe(
      result.principal + result.interestEarned
    );
  });

  it("returns zeros for zero principal", () => {
    const result = calculateTbillProjection({
      principal: 0,
      annualRate: 0.25,
      tenorDays: 91,
    });
    expect(result.interestEarned).toBe(0);
    expect(result.maturityAmount).toBe(0);
  });
});
