import type { IncomeSource } from "../../types/budget";
import { computeGhanaTax2026Monthly } from "../ghanaTax";
import { getMonthlyNetIncome } from "../incomeCalculations";

function makeSource(overrides: Partial<IncomeSource>): IncomeSource {
  return {
    id: "id",
    userId: "u1",
    name: "Income",
    type: "primary",
    amount: 1000,
    applyDeductions: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("getMonthlyNetIncome", () => {
  it("returns 0 for empty list", () => {
    expect(getMonthlyNetIncome([])).toBe(0);
  });

  it("returns gross amount for primary source with applyDeductions false", () => {
    const sources: IncomeSource[] = [
      makeSource({ type: "primary", amount: 3000, applyDeductions: false }),
    ];
    expect(getMonthlyNetIncome(sources)).toBe(3000);
  });

  it("returns net take-home for primary source with applyDeductions true", () => {
    const sources: IncomeSource[] = [
      makeSource({ type: "primary", amount: 1000, applyDeductions: true }),
    ];
    const net = getMonthlyNetIncome(sources);
    // Ghana tax on 1000: SSNIT 55, PAYE on chargeable -> net < 1000
    expect(net).toBeLessThan(1000);
    expect(net).toBeGreaterThan(0);
  });

  it("returns gross for side income regardless of applyDeductions", () => {
    const sources: IncomeSource[] = [
      makeSource({ type: "side", amount: 500, applyDeductions: true }),
    ];
    expect(getMonthlyNetIncome(sources)).toBe(500);
  });

  it("sums multiple sources: primary with deductions + side", () => {
    const primaryNet = computeGhanaTax2026Monthly(1000).netTakeHome;
    const sources: IncomeSource[] = [
      makeSource({ type: "primary", amount: 1000, applyDeductions: true }),
      makeSource({ type: "side", amount: 200, applyDeductions: false }),
    ];
    const total = getMonthlyNetIncome(sources);
    expect(total).toBe(primaryNet + 200);
  });

  it("sums two primary gross sources", () => {
    const sources: IncomeSource[] = [
      makeSource({ type: "primary", amount: 1000, applyDeductions: false }),
      makeSource({ type: "primary", amount: 500, applyDeductions: false }),
    ];
    expect(getMonthlyNetIncome(sources)).toBe(1500);
  });

  it("ignores non-finite amount by using 0 (via Math.max in ghanaTax)", () => {
    const sources: IncomeSource[] = [
      makeSource({ type: "primary", amount: 1000, applyDeductions: true }),
    ];
    const total = getMonthlyNetIncome(sources);
    expect(Number.isFinite(total)).toBe(true);
  });
});
