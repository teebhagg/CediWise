import {
  computeIntelligentAllocation,
  strategyToAllocation,
} from "../budget-intelligence";

describe("computeIntelligentAllocation", () => {
  it("returns survival when fixed costs > 85% of income", () => {
    const result = computeIntelligentAllocation({
      stableSalary: 3000,
      applyTax: false,
      sideIncome: 0,
      rent: 2000,
      titheRemittance: 200,
      debtObligations: 300,
      utilitiesTotal: 400,
    });
    expect(result.strategy).toBe("survival");
    expect(result.allocation.needsPct).toBeGreaterThanOrEqual(0.85);
    expect(result.allocation.savingsPct).toBeLessThanOrEqual(0.1);
  });

  it("returns balanced for moderate fixed cost ratio", () => {
    const result = computeIntelligentAllocation({
      stableSalary: 5000,
      applyTax: false,
      sideIncome: 0,
      rent: 1000,
      titheRemittance: 100,
      debtObligations: 0,
      utilitiesTotal: 150,
    });
    expect(
      result.allocation.needsPct +
        result.allocation.wantsPct +
        result.allocation.savingsPct
    ).toBeCloseTo(1, 5);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it("favors savings when fixed costs < 35%", () => {
    const result = computeIntelligentAllocation({
      stableSalary: 8000,
      applyTax: false,
      sideIncome: 0,
      rent: 800,
      titheRemittance: 100,
      debtObligations: 0,
      utilitiesTotal: 100,
    });
    expect(result.fixedCostRatio).toBeLessThan(0.35);
    expect(result.allocation.needsPct).toBeLessThan(0.5);
    expect(result.allocation.savingsPct).toBeGreaterThan(0.15);
  });

  it("applies life stage modifiers", () => {
    const base = computeIntelligentAllocation({
      stableSalary: 4000,
      applyTax: false,
      sideIncome: 0,
      rent: 1200,
      titheRemittance: 100,
      debtObligations: 0,
      utilitiesTotal: 150,
      lifeStage: "young_professional",
    });
    const family = computeIntelligentAllocation({
      stableSalary: 4000,
      applyTax: false,
      sideIncome: 0,
      rent: 1200,
      titheRemittance: 100,
      debtObligations: 0,
      utilitiesTotal: 150,
      lifeStage: "family",
    });
    expect(family.allocation.needsPct).toBeGreaterThan(
      base.allocation.needsPct
    );
  });

  it("applies financial priority modifiers", () => {
    const debtFocus = computeIntelligentAllocation({
      stableSalary: 5000,
      applyTax: false,
      sideIncome: 0,
      rent: 1500,
      titheRemittance: 0,
      debtObligations: 500,
      utilitiesTotal: 100,
      financialPriority: "debt_payoff",
    });
    expect(debtFocus.allocation.wantsPct).toBeLessThan(0.25);
  });

  it("normalizes allocation to sum to 1", () => {
    const result = computeIntelligentAllocation({
      stableSalary: 5000,
      applyTax: false,
      sideIncome: 0,
      rent: 1000,
      titheRemittance: 0,
      debtObligations: 0,
      utilitiesTotal: 100,
    });
    const sum =
      result.allocation.needsPct +
      result.allocation.wantsPct +
      result.allocation.savingsPct;
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("strategyToAllocation", () => {
  it("returns correct allocation for survival", () => {
    const a = strategyToAllocation("survival");
    expect(a.needsPct).toBe(0.9);
    expect(a.wantsPct).toBe(0.1);
    expect(a.savingsPct).toBe(0);
  });

  it("returns correct allocation for balanced", () => {
    const a = strategyToAllocation("balanced");
    expect(a.needsPct).toBe(0.5);
    expect(a.wantsPct).toBe(0.3);
    expect(a.savingsPct).toBe(0.2);
  });

  it("returns correct allocation for aggressive", () => {
    const a = strategyToAllocation("aggressive");
    expect(a.needsPct).toBe(0.4);
    expect(a.wantsPct).toBe(0.2);
    expect(a.savingsPct).toBe(0.4);
  });
});
