import {
  determineTrend,
  computeConfidence,
  shouldSuggestUnderspend,
  computeSuggestedLimit,
  MIN_CYCLES_FOR_TREND,
} from "../spendingPatternsLogic";

describe("determineTrend", () => {
  it('returns "stable" for fewer than MIN_CYCLES_FOR_TREND amounts', () => {
    expect(determineTrend([100])).toBe("stable");
  });

  it('returns "stable" when amounts are consistent', () => {
    expect(determineTrend([100, 100, 100, 100])).toBe("stable");
  });

  it('returns "increasing" when recent spend is higher', () => {
    expect(determineTrend([100, 110, 150, 200])).toBe("increasing");
  });

  it('returns "decreasing" when recent spend is lower', () => {
    expect(determineTrend([200, 180, 100, 80])).toBe("decreasing");
  });

  it('returns "stable" when older average is 0', () => {
    expect(determineTrend([0, 0, 100, 200])).toBe("stable");
  });

  it("uses variance-aware thresholds to avoid false trend detection", () => {
    // High variance should suppress small changes
    const amounts = [100, 120, 110, 115];
    const avgSpent = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = Math.sqrt(
      amounts.reduce((s, a) => s + Math.pow(a - avgSpent, 2), 0) /
        amounts.length
    );
    const trend = determineTrend(amounts, variance, avgSpent);
    expect(trend).toBe("stable");
  });

  it("detects trend despite variance when change is large", () => {
    const amounts = [100, 110, 200, 250];
    const avgSpent = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = 20;
    expect(determineTrend(amounts, variance, avgSpent)).toBe("increasing");
  });
});

describe("computeConfidence", () => {
  it("returns 0 for fewer than MIN_CYCLES", () => {
    expect(computeConfidence(1, 10, 100)).toBe(0);
  });

  it("returns base confidence (0.5) for exactly 2 cycles", () => {
    // 2 cycles, zero variance → +0.2 for cv <= 0.15 → 0.7
    const conf = computeConfidence(2, 0, 100);
    expect(conf).toBeGreaterThanOrEqual(0.5);
  });

  it("increases with more cycles", () => {
    const conf2 = computeConfidence(2, 10, 100);
    const conf4 = computeConfidence(4, 10, 100);
    const conf6 = computeConfidence(6, 10, 100);
    expect(conf4).toBeGreaterThan(conf2);
    expect(conf6).toBeGreaterThan(conf4);
  });

  it("increases with lower coefficient of variation", () => {
    const lowCV = computeConfidence(4, 10, 100); // cv = 0.1
    const highCV = computeConfidence(4, 70, 100); // cv = 0.7
    expect(lowCV).toBeGreaterThan(highCV);
  });

  it("is capped between 0 and 1", () => {
    const conf = computeConfidence(10, 0, 100);
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });

  it("decays for stale data (> 90 days)", () => {
    const staleDate = new Date(
      Date.now() - 100 * 24 * 60 * 60 * 1000
    ).toISOString();
    const fresh = computeConfidence(4, 10, 100);
    const stale = computeConfidence(4, 10, 100, staleDate);
    expect(stale).toBeLessThan(fresh);
  });

  it("does not decay for recent data", () => {
    const recentDate = new Date().toISOString();
    const fresh = computeConfidence(4, 10, 100);
    const recent = computeConfidence(4, 10, 100, recentDate);
    expect(recent).toBe(fresh);
  });
});

describe("shouldSuggestUnderspend", () => {
  it("returns false when avgSpent is 0", () => {
    expect(shouldSuggestUnderspend(50, 0, 10, 200)).toBe(false);
  });

  it("returns false when limit is 0", () => {
    expect(shouldSuggestUnderspend(50, 100, 10, 0)).toBe(false);
  });

  it("returns false when utilization >= 50%", () => {
    expect(shouldSuggestUnderspend(100, 200, 10, 200)).toBe(false);
  });

  it("returns false when not significantly below average", () => {
    // spent >= avgSpent * 0.7
    expect(shouldSuggestUnderspend(75, 100, 10, 200)).toBe(false);
  });

  it("returns true when low utilization and significantly below avg with low variance", () => {
    expect(shouldSuggestUnderspend(20, 100, 10, 200)).toBe(true);
  });

  it("requires high z-score for high variance data", () => {
    // High variance: variance / avgSpent > 0.35
    // z-score = (100 - 20) / 50 = 1.6, which is < 2
    expect(shouldSuggestUnderspend(20, 100, 50, 200)).toBe(false);

    // z-score = (100 - 0) / 50 = 2, which >= 2
    expect(shouldSuggestUnderspend(0, 100, 50, 200)).toBe(true);
  });
});

describe("computeSuggestedLimit", () => {
  it("returns currentLimit when avgSpent is 0", () => {
    expect(computeSuggestedLimit(0, 10, "stable", 500)).toBe(500);
  });

  it("applies 10% buffer for stable trend with low variance", () => {
    const result = computeSuggestedLimit(100, 10, "stable", 200);
    // avgSpent * 1.1 = 110
    expect(result).toBeCloseTo(110, 0);
  });

  it("increases buffer for high variance", () => {
    // cv > 0.3 → buffer = 1.2
    const result = computeSuggestedLimit(100, 40, "stable", 200);
    // avgSpent * 1.2 = 120
    expect(result).toBeCloseTo(120, 0);
  });

  it("increases buffer for increasing trend", () => {
    const stable = computeSuggestedLimit(100, 10, "stable", 200);
    const increasing = computeSuggestedLimit(100, 10, "increasing", 200);
    expect(increasing).toBeGreaterThan(stable);
  });

  it("decreases buffer for decreasing trend", () => {
    const stable = computeSuggestedLimit(100, 10, "stable", 200);
    const decreasing = computeSuggestedLimit(100, 10, "decreasing", 200);
    expect(decreasing).toBeLessThan(stable);
  });

  it("caps suggested limit at 120% of current limit", () => {
    // avgSpent = 500, buffer = 1.1, suggested = 550
    // But cap = currentLimit * 1.2 = 120
    const result = computeSuggestedLimit(500, 10, "stable", 100);
    expect(result).toBeLessThanOrEqual(120);
  });

  it("never returns negative", () => {
    const result = computeSuggestedLimit(1, 10, "decreasing", 1);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
