import { computeGhanaTax2026Monthly } from "../ghanaTax";
import { GHANA_TAX_FALLBACK_2026 } from "../taxSync";

describe("computeGhanaTax2026Monthly", () => {
  // ── SSNIT Deductions ────────────────────────────────────────────────
  it("calculates SSNIT at 5.5% of gross", () => {
    const result = computeGhanaTax2026Monthly(1000);
    expect(result.ssnit).toBeCloseTo(55, 2);
  });

  it("caps SSNIT at maximum insurable earnings", () => {
    // Monthly cap = 69,000 * 0.055 = 3,795
    const result = computeGhanaTax2026Monthly(100_000);
    expect(result.ssnit).toBeCloseTo(69_000 * 0.055, 2);
  });

  it("handles SSNIT below cap", () => {
    const result = computeGhanaTax2026Monthly(5000);
    expect(result.ssnit).toBeCloseTo(5000 * 0.055, 2);
  });

  // ── PAYE Brackets ──────────────────────────────────────────────────
  it("applies 0% PAYE for chargeable income within first band (490)", () => {
    // Gross 500 → SSNIT = 27.50 → chargeable = 472.50 (< 490)
    const result = computeGhanaTax2026Monthly(500);
    expect(result.paye).toBe(0);
  });

  it("applies 5% for second band (490–600)", () => {
    // Gross 600 → SSNIT = 33 → chargeable = 567
    // PAYE = (567 - 490) * 0.05 = 77 * 0.05 = 3.85
    const result = computeGhanaTax2026Monthly(600);
    expect(result.paye).toBeCloseTo(3.85, 2);
  });

  it("applies progressive bands for higher income", () => {
    // Gross 2000 → SSNIT = 110 → chargeable = 1890
    // Band 1: 490 * 0.00  = 0
    // Band 2: 110 * 0.05  = 5.5
    // Band 3: 130 * 0.10  = 13
    // Band 4: 1160 * 0.175 = 203
    // Total PAYE = 221.5
    const result = computeGhanaTax2026Monthly(2000);
    expect(result.paye).toBeCloseTo(221.5, 1);
  });

  // ── Net Take-Home ──────────────────────────────────────────────────
  it("calculates net take-home = gross - ssnit - paye", () => {
    const result = computeGhanaTax2026Monthly(3000);
    expect(result.netTakeHome).toBeCloseTo(
      3000 - result.ssnit - result.paye,
      2
    );
  });

  it("net take-home is always >= 0", () => {
    const result = computeGhanaTax2026Monthly(1);
    expect(result.netTakeHome).toBeGreaterThanOrEqual(0);
  });

  // ── Edge Cases ─────────────────────────────────────────────────────
  it("returns zeros for 0 salary", () => {
    const result = computeGhanaTax2026Monthly(0);
    expect(result.ssnit).toBe(0);
    expect(result.nhis).toBe(0);
    expect(result.paye).toBe(0);
    expect(result.netTakeHome).toBe(0);
  });

  it("treats negative salary as 0", () => {
    const result = computeGhanaTax2026Monthly(-5000);
    expect(result.ssnit).toBe(0);
    expect(result.nhis).toBe(0);
    expect(result.paye).toBe(0);
    expect(result.netTakeHome).toBe(0);
  });

  it("treats NaN salary as 0", () => {
    const result = computeGhanaTax2026Monthly(NaN);
    expect(result.ssnit).toBe(0);
    expect(result.nhis).toBe(0);
    expect(result.paye).toBe(0);
    expect(result.netTakeHome).toBe(0);
  });

  it("treats Infinity salary as 0", () => {
    const result = computeGhanaTax2026Monthly(Infinity);
    expect(result.ssnit).toBe(0);
    expect(result.nhis).toBe(0);
    expect(result.paye).toBe(0);
    expect(result.netTakeHome).toBe(0);
  });

  // ── NHIS (Employer-funded) ─────────────────────────────────────────
  it("calculates NHIS at 2.5% of gross", () => {
    const result = computeGhanaTax2026Monthly(5000);
    expect(result.nhis).toBeCloseTo(125, 2); // 5000 * 0.025
  });

  it("caps NHIS at maximum insurable earnings", () => {
    // Monthly cap = 69,000 * 0.025 = 1,725
    const result = computeGhanaTax2026Monthly(100_000);
    expect(result.nhis).toBeCloseTo(69_000 * 0.025, 2);
  });

  it("NHIS does not affect net take-home", () => {
    const result = computeGhanaTax2026Monthly(3000);
    expect(result.netTakeHome).toBeCloseTo(
      3000 - result.ssnit - result.paye,
      2
    );
  });

  it("NHIS uses same insurable earnings cap as SSNIT", () => {
    const below = computeGhanaTax2026Monthly(10_000);
    const above = computeGhanaTax2026Monthly(80_000);
    expect(below.nhis).toBeCloseTo(10_000 * 0.025, 2);
    expect(above.nhis).toBeCloseTo(69_000 * 0.025, 2);
  });

  it("respects custom nhis_rate in TaxConfig", () => {
    const customConfig = {
      ...GHANA_TAX_FALLBACK_2026,
      nhis_rate: 0.03,
    };
    const result = computeGhanaTax2026Monthly(5000, customConfig);
    expect(result.nhis).toBeCloseTo(150, 2); // 5000 * 0.03
  });

  // ── Custom Config ──────────────────────────────────────────────────
  it("uses custom TaxConfig when provided", () => {
    const customConfig = {
      employee_ssnit_rate: 0.1,
      ssnit_monthly_cap: 50_000,
      nhis_rate: 0.025,
      paye_brackets: [
        { band_width: 500, rate: 0 },
        { band_width: null, rate: 0.2 },
      ],
    };
    const result = computeGhanaTax2026Monthly(1000, customConfig);
    expect(result.ssnit).toBeCloseTo(100, 2); // 10% of 1000
    expect(result.nhis).toBeCloseTo(25, 2); // 2.5% of 1000
    // chargeable = 900, first 500 at 0%, remaining 400 at 20% = 80
    expect(result.paye).toBeCloseTo(80, 2);
    expect(result.netTakeHome).toBeCloseTo(820, 2);
  });

  it("defaults to GHANA_TAX_FALLBACK_2026 config", () => {
    const withDefault = computeGhanaTax2026Monthly(1000);
    const withExplicit = computeGhanaTax2026Monthly(
      1000,
      GHANA_TAX_FALLBACK_2026
    );
    expect(withDefault).toEqual(withExplicit);
  });
});
