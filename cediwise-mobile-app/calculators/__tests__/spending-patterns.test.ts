/**
 * Phase 1.1: Unit tests for spending pattern helpers (determineTrend,
 * shouldSuggestUnderspend, computeConfidence). Pure logic in utils/spendingPatternsLogic.
 */
import {
  computeConfidence,
  determineTrend,
  shouldSuggestUnderspend,
} from "../../utils/spendingPatternsLogic";

describe("determineTrend", () => {
  it("returns stable when fewer than 2 cycles", () => {
    expect(determineTrend([100])).toBe("stable");
    expect(determineTrend([], 0, 0)).toBe("stable");
  });

  it("returns increasing when recent half is >10% higher and above noise", () => {
    const amounts = [100, 100, 120, 130];
    expect(determineTrend(amounts, 10, 112.5)).toBe("increasing");
  });

  it("returns decreasing when recent half is >10% lower", () => {
    const amounts = [120, 130, 100, 100];
    expect(determineTrend(amounts, 10, 112.5)).toBe("decreasing");
  });

  it("returns stable when change is within variance (noise)", () => {
    const amounts = [100, 105, 102, 98];
    const avg = 101.25;
    const variance = 2.9;
    expect(determineTrend(amounts, variance, avg)).toBe("stable");
  });
});

describe("computeConfidence", () => {
  it("returns 0 when cycle count < 2", () => {
    expect(computeConfidence(0, 0, 100)).toBe(0);
    expect(computeConfidence(1, 0, 100)).toBe(0);
  });

  it("returns higher confidence for more cycles", () => {
    const c2 = computeConfidence(2, 0, 100);
    const c4 = computeConfidence(4, 0, 100);
    const c6 = computeConfidence(6, 0, 100);
    expect(c4).toBeGreaterThan(c2);
    expect(c6).toBeGreaterThan(c4);
  });

  it("returns lower confidence for high variance relative to avg", () => {
    const lowVar = computeConfidence(4, 10, 100);
    const highVar = computeConfidence(4, 80, 100);
    expect(lowVar).toBeGreaterThan(highVar);
  });

  it("clamps result between 0 and 1", () => {
    const c = computeConfidence(6, 0, 1000);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });
});

describe("shouldSuggestUnderspend", () => {
  it("returns false when utilization >= 0.5", () => {
    expect(shouldSuggestUnderspend(100, 80, 20, 200)).toBe(false);
  });

  it("returns false when spent >= 70% of avgSpent", () => {
    expect(shouldSuggestUnderspend(80, 100, 10, 200)).toBe(false);
  });

  it("returns true when under 50% utilization, spent < 70% of avg, low variance", () => {
    expect(shouldSuggestUnderspend(40, 100, 10, 200)).toBe(true);
  });

  it("returns false for high variance unless underspend is large (z >= 2)", () => {
    const avgSpent = 100;
    const variance = 50;
    const spent = 95;
    expect(shouldSuggestUnderspend(spent, avgSpent, variance, 200)).toBe(false);
    expect(shouldSuggestUnderspend(0, avgSpent, variance, 200)).toBe(true);
  });
});
