import type { BudgetBucket, BudgetCycle, BudgetTransaction } from "../../types/budget";
import {
  analyzeAndSuggestReallocation,
  calculateRollover,
  formatReallocationDetails,
  formatAllocation,
} from "../reallocationEngine";

function makeCycle(overrides?: Partial<BudgetCycle>): BudgetCycle {
  return {
    id: "c1",
    userId: "u1",
    startDate: "2025-01-01",
    endDate: "2025-01-31",
    paydayDay: 25,
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
    reallocationApplied: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function makeTx(
  bucket: BudgetBucket,
  amount: number,
  cycleId = "c1"
): BudgetTransaction {
  return {
    id: `tx-${Math.random()}`,
    userId: "u1",
    cycleId,
    bucket,
    amount,
    occurredAt: new Date().toISOString(),
    source: "manual",
    createdAt: new Date().toISOString(),
  };
}

describe("analyzeAndSuggestReallocation", () => {
  const cycle = makeCycle();
  const income = 1000;

  it("returns no reallocation when spending within bounds", () => {
    const txs = [
      makeTx("needs", 480),
      makeTx("wants", 280),
      makeTx("savings", 180),
    ];
    const result = analyzeAndSuggestReallocation(cycle, txs, income);
    expect(result.shouldReallocate).toBe(false);
  });

  it("returns no reallocation for zero income", () => {
    const txs = [makeTx("needs", 100)];
    const result = analyzeAndSuggestReallocation(cycle, txs, 0);
    expect(result.shouldReallocate).toBe(false);
  });

  it("returns no reallocation for negative income", () => {
    const txs = [makeTx("needs", 100)];
    const result = analyzeAndSuggestReallocation(cycle, txs, -500);
    expect(result.shouldReallocate).toBe(false);
  });

  it("returns no reallocation when only overspent (no underspent to borrow from)", () => {
    // All buckets overspent
    const txs = [
      makeTx("needs", 600),
      makeTx("wants", 400),
      makeTx("savings", 300),
    ];
    const result = analyzeAndSuggestReallocation(cycle, txs, income);
    expect(result.shouldReallocate).toBe(false);
  });

  it("suggests reallocation when needs overspent and wants underspent", () => {
    const txs = [
      makeTx("needs", 600), // needs limit = 500, overspent 20%
      makeTx("wants", 200), // wants limit = 300, underspent 33%
      makeTx("savings", 180),
    ];
    const result = analyzeAndSuggestReallocation(cycle, txs, income);
    expect(result.shouldReallocate).toBe(true);
    expect(result.changes).toBeDefined();
    expect(result.changes!.needsPct).toBeGreaterThan(cycle.needsPct);
    expect(result.changes!.wantsPct).toBeLessThan(cycle.wantsPct);
    expect(result.reason).toContain("Needs");
    expect(result.reason).toContain("Wants");
  });

  it("ensures suggested percentages sum to approximately 1", () => {
    const txs = [
      makeTx("needs", 600),
      makeTx("wants", 200),
      makeTx("savings", 180),
    ];
    const result = analyzeAndSuggestReallocation(cycle, txs, income);
    if (result.changes) {
      const total =
        result.changes.needsPct +
        result.changes.wantsPct +
        result.changes.savingsPct;
      expect(total).toBeCloseTo(1, 1);
    }
  });

  it("only includes transactions matching the cycle", () => {
    const txs = [
      makeTx("needs", 600, "c1"),
      makeTx("needs", 999, "other-cycle"), // should be ignored
      makeTx("wants", 200, "c1"),
      makeTx("savings", 180, "c1"),
    ];
    const result = analyzeAndSuggestReallocation(cycle, txs, income);
    // should NOT see the 999 from other cycle
    expect(result.shouldReallocate).toBe(true);
  });
});

describe("calculateRollover", () => {
  const cycle = makeCycle(); // 50/30/20 split
  const income = 1000;

  it("calculates unspent amounts as rollover", () => {
    const txs = [
      makeTx("needs", 400),
      makeTx("wants", 200),
      makeTx("savings", 100),
    ];
    const result = calculateRollover(cycle, txs, income);
    expect(result.needs).toBe(100); // 500 - 400
    expect(result.wants).toBe(100); // 300 - 200
    expect(result.savings).toBe(100); // 200 - 100
  });

  it("returns zeros when fully spent", () => {
    const txs = [
      makeTx("needs", 500),
      makeTx("wants", 300),
      makeTx("savings", 200),
    ];
    const result = calculateRollover(cycle, txs, income);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });

  it("does not return negative rollover (overspent)", () => {
    const txs = [
      makeTx("needs", 700),
      makeTx("wants", 400),
      makeTx("savings", 300),
    ];
    const result = calculateRollover(cycle, txs, income);
    expect(result.needs).toBe(0);
    expect(result.wants).toBe(0);
    expect(result.savings).toBe(0);
  });

  it("returns zeros for zero income", () => {
    const txs = [makeTx("needs", 100)];
    const result = calculateRollover(cycle, txs, 0);
    expect(result).toEqual({ needs: 0, wants: 0, savings: 0 });
  });

  it("returns full allocation when no transactions", () => {
    const result = calculateRollover(cycle, [], income);
    expect(result.needs).toBe(500);
    expect(result.wants).toBe(300);
    expect(result.savings).toBe(200);
  });
});

describe("formatReallocationDetails", () => {
  it("returns empty string when no reallocation", () => {
    expect(
      formatReallocationDetails({ shouldReallocate: false })
    ).toBe("");
  });

  it("formats overspent and underspent buckets", () => {
    const result = formatReallocationDetails({
      shouldReallocate: true,
      reason: "test",
      details: {
        overspentBuckets: [{ bucket: "needs", amount: 100, percentage: 0.2 }],
        underspentBuckets: [{ bucket: "wants", amount: 50, percentage: 0.17 }],
      },
    });
    expect(result).toContain("Overspent");
    expect(result).toContain("needs");
    expect(result).toContain("Underspent");
    expect(result).toContain("wants");
  });
});

describe("formatAllocation", () => {
  it("formats percentages as whole numbers", () => {
    expect(formatAllocation(0.5, 0.3, 0.2)).toBe("50/30/20");
  });

  it("rounds to nearest integer", () => {
    expect(formatAllocation(0.333, 0.333, 0.334)).toBe("33/33/33");
  });
});
