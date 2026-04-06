/**
 * Tests for utils/cashFlow.ts
 *
 * All date-sensitive tests use jest.useFakeTimers() to pin "today" to a known
 * value so assertions are deterministic regardless of when the suite runs.
 *
 * Pinned "today": 2026-04-15T06:00:00.000Z (Wednesday, 15 April 2026)
 */

import {
  computeCashFlowProjection,
  formatRunOutDate,
  isDataStale,
  isTodayPayday,
  needsSalaryReset,
  toMonthlyEquivalent,
} from "../cashFlow";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Midnight UTC so that (today - cycleStart) is always an exact whole number of days.
const TODAY = new Date("2026-04-15T00:00:00.000Z");

function pinToday() {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
}

function restoreDate() {
  jest.useRealTimers();
}

/**
 * Build a list of transactions with equal amounts summing to `total`,
 * all stamped within the current cycle (dates don't affect the calculation
 * in the current implementation).
 */
function makeTxs(total: number, count = 1) {
  const amount = total / count;
  return Array.from({ length: count }, (_, i) => ({
    amount,
    occurredAt: `2026-04-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`,
  }));
}

const noExpenses: Parameters<typeof computeCashFlowProjection>[2] = [];

// ─── toMonthlyEquivalent ──────────────────────────────────────────────────────

describe("toMonthlyEquivalent", () => {
  it("returns the amount unchanged for monthly frequency", () => {
    expect(toMonthlyEquivalent({ amount: 500, frequency: "monthly", isActive: true })).toBe(500);
  });

  it("converts weekly to monthly (×52/12)", () => {
    expect(toMonthlyEquivalent({ amount: 100, frequency: "weekly", isActive: true })).toBeCloseTo(
      (100 * 52) / 12,
      4
    );
  });

  it("converts bi-weekly to monthly (×26/12)", () => {
    expect(
      toMonthlyEquivalent({ amount: 200, frequency: "bi_weekly", isActive: true })
    ).toBeCloseTo((200 * 26) / 12, 4);
  });

  it("converts quarterly to monthly (÷3)", () => {
    expect(
      toMonthlyEquivalent({ amount: 900, frequency: "quarterly", isActive: true })
    ).toBeCloseTo(300, 4);
  });

  it("converts annual to monthly (÷12)", () => {
    expect(
      toMonthlyEquivalent({ amount: 1200, frequency: "annually", isActive: true })
    ).toBeCloseTo(100, 4);
  });

  it("handles zero amount", () => {
    expect(toMonthlyEquivalent({ amount: 0, frequency: "monthly", isActive: true })).toBe(0);
  });

  it("handles fractional amounts", () => {
    expect(
      toMonthlyEquivalent({ amount: 0.5, frequency: "monthly", isActive: true })
    ).toBeCloseTo(0.5, 4);
  });
});

// ─── computeCashFlowProjection — data sufficiency ────────────────────────────

describe("computeCashFlowProjection — data sufficiency", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  it("returns 'insufficient' when cycle started today (0 elapsed days → dataDays=1)", () => {
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-15");
    expect(result.sufficiency).toBe("insufficient");
    expect(result.dailyBurnRate).toBe(0);
    expect(result.runOutDate).toBeNull();
    expect(result.daysUntilRunOut).toBeNull();
    expect(result.safeToSpendToday).toBe(0);
    expect(result.isNegative).toBe(false);
  });

  it("returns 'insufficient' when cycle started 1 day ago (dataDays=2)", () => {
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-14");
    expect(result.sufficiency).toBe("insufficient");
  });

  it("returns 'insufficient' exactly at 2 elapsed days (dataDays=2 < 3)", () => {
    // Apr13 00:00 → Apr15 00:00 = exactly 2 days; ceil(2)=2 < 3 → insufficient
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-13");
    expect(result.sufficiency).toBe("insufficient");
  });

  it("returns 'warmup' at exactly 3 elapsed days (dataDays=3)", () => {
    // Apr12 00:00 → Apr15 00:00 = exactly 3 days → warmup
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-12");
    expect(result.sufficiency).toBe("warmup");
  });

  it("returns 'warmup' at 6 elapsed days (dataDays=6, last warmup day)", () => {
    // Apr09 00:00 → Apr15 00:00 = exactly 6 days → warmup
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-09");
    expect(result.sufficiency).toBe("warmup");
  });

  it("returns 'full' at exactly 7 elapsed days (dataDays=7)", () => {
    // Apr08 00:00 → Apr15 00:00 = exactly 7 days → full
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-08");
    expect(result.sufficiency).toBe("full");
  });

  it("returns 'full' with dataDays=14 (2 weeks of data)", () => {
    // Apr01 00:00 → Apr15 00:00 = exactly 14 days → full
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-01");
    expect(result.sufficiency).toBe("full");
    expect(result.dataDays).toBe(14);
  });
});

// ─── computeCashFlowProjection — zero burn rate ───────────────────────────────

describe("computeCashFlowProjection — zero / no spending", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  // dataDays = 7 (full projection)
  const CYCLE_START = "2026-04-08";

  it("returns safeToSpendToday = currentBalance when burn rate is 0", () => {
    const result = computeCashFlowProjection(2000, [], noExpenses, CYCLE_START);
    expect(result.dailyBurnRate).toBe(0);
    expect(result.safeToSpendToday).toBe(2000);
    expect(result.runOutDate).toBeNull();
    expect(result.daysUntilRunOut).toBeNull();
    expect(result.isNegative).toBe(false);
  });

  it("burn rate is 0 when no transactions and no recurring expenses", () => {
    const result = computeCashFlowProjection(500, [], noExpenses, CYCLE_START);
    expect(result.dailyBurnRate).toBe(0);
  });

  it("inactive recurring expenses do not contribute to burn rate", () => {
    const result = computeCashFlowProjection(
      1000,
      [],
      [{ amount: 1000, frequency: "monthly", isActive: false }],
      CYCLE_START
    );
    expect(result.dailyBurnRate).toBe(0);
  });
});

// ─── computeCashFlowProjection — burn rate formula ───────────────────────────

describe("computeCashFlowProjection — burn rate calculation", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  /**
   * Pin to 14 days of data (Apr01 00:00 → Apr15 00:00 = exactly 14 days).
   * Formula: (fixedMonthly + totalVariable × 30/14) / 30
   */
  const CYCLE_START_14D = "2026-04-01";

  it("computes burn rate from variable spending only (no fixed expenses)", () => {
    // dataDays=14, totalVariable=700
    // burnRate = (0 + 700 × 30/14) / 30 = 700/14 = 50/day
    const result = computeCashFlowProjection(3000, makeTxs(700), noExpenses, CYCLE_START_14D);
    expect(result.dailyBurnRate).toBeCloseTo(50, 2);
  });

  it("computes burn rate from fixed expenses only (no variable spending)", () => {
    // fixedMonthly=900 (monthly), burnRate = 900/30 = 30/day
    const result = computeCashFlowProjection(
      3000,
      [],
      [{ amount: 900, frequency: "monthly", isActive: true }],
      CYCLE_START_14D
    );
    expect(result.dailyBurnRate).toBeCloseTo(30, 2);
  });

  it("combines fixed and variable spending in burn rate", () => {
    // fixedMonthly = 600 (monthly) → 600/30 = 20/day fixed component
    // totalVariable = 280 over 14 days → 280 × (30/14) / 30 = 280/14 = 20/day variable
    // total burnRate = 40/day
    const result = computeCashFlowProjection(
      5000,
      makeTxs(280),
      [{ amount: 600, frequency: "monthly", isActive: true }],
      CYCLE_START_14D
    );
    expect(result.dailyBurnRate).toBeCloseTo(40, 2);
  });

  it("handles multiple recurring expenses of different frequencies", () => {
    // monthly: 300 → 300/30 = 10/day
    // weekly: 50 → (50*52/12)/30 = 216.67/30 = 7.22/day
    // total fixed daily = ~17.22/day
    const fixed = [
      { amount: 300, frequency: "monthly" as const, isActive: true },
      { amount: 50, frequency: "weekly" as const, isActive: true },
    ];
    const result = computeCashFlowProjection(5000, [], fixed, CYCLE_START_14D);
    const expectedFixed = 300 + (50 * 52) / 12;
    expect(result.dailyBurnRate).toBeCloseTo(expectedFixed / 30, 2);
  });

  it("only counts active recurring expenses", () => {
    const expensesWithInactive = [
      { amount: 600, frequency: "monthly" as const, isActive: true },
      { amount: 1200, frequency: "monthly" as const, isActive: false },
    ];
    // Only 600 active: burnRate = 600/30 = 20/day
    const result = computeCashFlowProjection(
      3000,
      [],
      expensesWithInactive,
      CYCLE_START_14D
    );
    expect(result.dailyBurnRate).toBeCloseTo(20, 2);
  });

  it("burn rate uses dataDays=1 minimum (no division by zero from cycle start edge)", () => {
    // cycleStart = today: dataDays = max(1, ...) = 1 → insufficient → burnRate = 0
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, "2026-04-15");
    expect(result.dailyBurnRate).toBe(0);
  });
});

// ─── computeCashFlowProjection — run-out date ─────────────────────────────────

describe("computeCashFlowProjection — run-out date", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  // dataDays=14 for all tests below
  const CYCLE_START = "2026-04-01";

  it("calculates daysUntilRunOut from balance / dailyBurnRate", () => {
    // dataDays=14, burnRate = 700/14 = 50/day, balance = 1000
    // daysUntilRunOut = floor(1000/50) = 20
    const result = computeCashFlowProjection(1000, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.daysUntilRunOut).toBe(20);
  });

  it("daysUntilRunOut is 0 when balance is 0", () => {
    const result = computeCashFlowProjection(0, makeTxs(700), noExpenses, CYCLE_START);
    // 0 / burnRate = 0 → floor(0) = 0
    expect(result.daysUntilRunOut).toBe(0);
  });

  it("runOutDate is today when balance is 0", () => {
    const result = computeCashFlowProjection(0, makeTxs(700), noExpenses, CYCLE_START);
    const runOut = result.runOutDate!;
    expect(runOut.toDateString()).toBe(TODAY.toDateString());
  });

  it("runOutDate is exactly N days from today", () => {
    // dataDays=14, burnRate=50/day, balance=1500 → daysUntilRunOut=floor(1500/50)=30
    const result = computeCashFlowProjection(1500, makeTxs(700), noExpenses, CYCLE_START);
    const runOut = result.runOutDate!;
    const diffMs = runOut.getTime() - TODAY.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it("runOutDate is not null when there is a positive burn rate", () => {
    const result = computeCashFlowProjection(500, makeTxs(300), noExpenses, CYCLE_START);
    expect(result.runOutDate).not.toBeNull();
  });

  it("runOutDate is null when burn rate is 0", () => {
    const result = computeCashFlowProjection(1000, [], noExpenses, CYCLE_START);
    expect(result.runOutDate).toBeNull();
  });

  it("daysUntilRunOut floors fractional days (not rounds)", () => {
    // dataDays=14, burnRate=700/14=50/day
    // balance=99 → floor(99/50)=floor(1.98)=1
    const result = computeCashFlowProjection(99, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.daysUntilRunOut).toBe(1);
  });

  it("very large balance produces a far-future run-out date", () => {
    // dataDays=14, burnRate=700/14=50/day, balance=1_000_000 → days=20000
    const result = computeCashFlowProjection(
      1_000_000,
      makeTxs(700),
      noExpenses,
      CYCLE_START
    );
    expect(result.daysUntilRunOut).toBe(20000);
  });
});

// ─── computeCashFlowProjection — safe-to-spend ───────────────────────────────

describe("computeCashFlowProjection — safe-to-spend", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  /**
   * Today = April 15 00:00 UTC.
   * endOfMonth = last day of April = April 30 00:00 local (UTC+0).
   * remainingDaysInMonth = ceil((Apr30 00:00 - Apr15 00:00) / day_ms) = ceil(15) = 15.
   */
  const REMAINING_DAYS = 15;
  const CYCLE_START = "2026-04-01"; // dataDays=14

  it("safe-to-spend = balance - (burnRate × remainingDays)", () => {
    // burnRate = 700/14 = 50/day
    // safeToSpend = 2000 - (50 × 15) = 2000 - 750 = 1250
    const result = computeCashFlowProjection(2000, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.safeToSpendToday).toBeCloseTo(2000 - 50 * REMAINING_DAYS, 1);
    expect(result.isNegative).toBe(false);
  });

  it("safe-to-spend is 0 (clamped) when overspending is projected", () => {
    // burnRate = 50/day, balance = 100, remaining = 15
    // raw = 100 - 50*15 = -650 → clamped to 0
    const result = computeCashFlowProjection(100, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.safeToSpendToday).toBe(0);
    expect(result.isNegative).toBe(true);
  });

  it("isNegative=false when safe-to-spend is exactly 0", () => {
    // We need balance === burnRate × remainingDays exactly
    // burnRate = 50/day, remaining = 15 → balance needed = 750
    const result = computeCashFlowProjection(750, makeTxs(700), noExpenses, CYCLE_START);
    // 750 - 50*15 = 0 → not negative
    expect(result.isNegative).toBe(false);
    expect(result.safeToSpendToday).toBeGreaterThanOrEqual(0);
  });

  it("isNegative=true when safe-to-spend would be below 0", () => {
    const result = computeCashFlowProjection(50, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.isNegative).toBe(true);
  });

  it("safeToSpendToday is never negative (always clamped to 0)", () => {
    const result = computeCashFlowProjection(1, makeTxs(700), noExpenses, CYCLE_START);
    expect(result.safeToSpendToday).toBeGreaterThanOrEqual(0);
  });

  it("safeToSpendToday equals balance when burn rate is 0", () => {
    const result = computeCashFlowProjection(3000, [], noExpenses, CYCLE_START);
    expect(result.safeToSpendToday).toBe(3000);
  });
});

// ─── computeCashFlowProjection — edge cases / boundary values ─────────────────

describe("computeCashFlowProjection — boundary & edge values", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  const FULL_PROJECTION_START = "2026-04-01"; // Apr01→Apr15 = 14 days → 'full'
  const WARMUP_START = "2026-04-09";          // Apr09→Apr15 = 6 days  → 'warmup'

  it("handles very small balance (near zero)", () => {
    const result = computeCashFlowProjection(0.01, makeTxs(700), noExpenses, FULL_PROJECTION_START);
    expect(result.daysUntilRunOut).toBe(0);
    expect(result.safeToSpendToday).toBe(0);
    expect(result.isNegative).toBe(true);
  });

  it("handles very large balance without overflow", () => {
    const result = computeCashFlowProjection(
      Number.MAX_SAFE_INTEGER / 100,
      makeTxs(700),
      noExpenses,
      FULL_PROJECTION_START
    );
    expect(result.daysUntilRunOut).toBeGreaterThan(0);
    expect(Number.isFinite(result.daysUntilRunOut!)).toBe(true);
  });

  it("warmup projection still computes meaningful values", () => {
    // Apr09→Apr15 = 6 days, totalVariable=300
    // burnRate = (0 + 300 × 30/6) / 30 = 300/6 = 50/day
    const result = computeCashFlowProjection(1000, makeTxs(300), noExpenses, WARMUP_START);
    expect(result.sufficiency).toBe("warmup");
    expect(result.dailyBurnRate).toBeCloseTo(50, 2);
    expect(result.daysUntilRunOut).not.toBeNull();
  });

  it("returns correct dataDays in result", () => {
    // Apr01→Apr15 = 14 days exactly (both midnight UTC)
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, FULL_PROJECTION_START);
    expect(result.dataDays).toBe(14);
  });

  it("warmup dataDays is between 3 and 6 inclusive", () => {
    // Apr09→Apr15 = 6 days exactly
    const result = computeCashFlowProjection(1000, makeTxs(100), noExpenses, WARMUP_START);
    expect(result.dataDays).toBeGreaterThanOrEqual(3);
    expect(result.dataDays).toBeLessThanOrEqual(6);
  });

  it("handles multiple transactions (aggregates amounts)", () => {
    // 5 transactions × 100 = 500 total; same as single 500
    const multiTx = makeTxs(500, 5);
    const singleTx = makeTxs(500, 1);
    const rMulti = computeCashFlowProjection(2000, multiTx, noExpenses, FULL_PROJECTION_START);
    const rSingle = computeCashFlowProjection(2000, singleTx, noExpenses, FULL_PROJECTION_START);
    expect(rMulti.dailyBurnRate).toBeCloseTo(rSingle.dailyBurnRate, 4);
  });

  it("handles a mix of active and inactive recurring expenses", () => {
    const expenses = [
      { amount: 300, frequency: "monthly" as const, isActive: true },
      { amount: 600, frequency: "monthly" as const, isActive: false },
      { amount: 300, frequency: "monthly" as const, isActive: true },
    ];
    // Only 2 active × 300 = 600/month → 20/day
    const result = computeCashFlowProjection(2000, [], expenses, FULL_PROJECTION_START);
    expect(result.dailyBurnRate).toBeCloseTo(20, 2);
  });

  it("handles empty recurringExpenses array", () => {
    const result = computeCashFlowProjection(1000, makeTxs(100), [], FULL_PROJECTION_START);
    expect(result.sufficiency).toBe("full");
  });

  it("handles empty transactions array with active fixed expenses", () => {
    const result = computeCashFlowProjection(
      3000,
      [],
      [{ amount: 900, frequency: "monthly", isActive: true }],
      FULL_PROJECTION_START
    );
    expect(result.dailyBurnRate).toBeCloseTo(30, 2);
  });
});

// ─── formatRunOutDate ─────────────────────────────────────────────────────────

describe("formatRunOutDate", () => {
  beforeEach(pinToday);
  afterEach(restoreDate);

  it('returns "Today" for a date matching today', () => {
    expect(formatRunOutDate(new Date("2026-04-15T06:00:00.000Z"))).toBe("Today");
  });

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    expect(formatRunOutDate(new Date("2026-04-16T06:00:00.000Z"))).toBe("Tomorrow");
  });

  it("returns a formatted date string for dates further away", () => {
    const label = formatRunOutDate(new Date("2026-04-30T06:00:00.000Z"));
    expect(label).toMatch(/30/); // day number included
    expect(label).toMatch(/Apr/i); // month name
  });

  it("does not include year for same-year dates", () => {
    const label = formatRunOutDate(new Date("2026-06-15T06:00:00.000Z"));
    expect(label).not.toMatch(/2026/);
  });

  it("includes year for dates in a different year", () => {
    const label = formatRunOutDate(new Date("2027-01-20T06:00:00.000Z"));
    expect(label).toMatch(/2027/);
  });
});

// ─── isTodayPayday ────────────────────────────────────────────────────────────

describe("isTodayPayday", () => {
  beforeEach(pinToday); // Today = April 15
  afterEach(restoreDate);

  it("returns true when paydayDay matches today's day-of-month (15)", () => {
    expect(isTodayPayday(15)).toBe(true);
  });

  it("returns false when paydayDay does not match today (14 ≠ 15)", () => {
    expect(isTodayPayday(14)).toBe(false);
  });

  it("returns false when paydayDay does not match today (16 ≠ 15)", () => {
    expect(isTodayPayday(16)).toBe(false);
  });

  it("returns false when paydayDay is null", () => {
    expect(isTodayPayday(null)).toBe(false);
  });

  it("returns false for day 1 when today is April 15", () => {
    expect(isTodayPayday(1)).toBe(false);
  });

  it("returns false for day 31 when today is April 15", () => {
    expect(isTodayPayday(31)).toBe(false);
  });
});

// ─── needsSalaryReset ─────────────────────────────────────────────────────────

describe("needsSalaryReset", () => {
  beforeEach(pinToday); // Today = April 15
  afterEach(restoreDate);

  it("returns true when today is payday and lastReset is null (never reset)", () => {
    expect(needsSalaryReset(15, null)).toBe(true);
  });

  it("returns true when today is payday and lastReset was yesterday", () => {
    expect(needsSalaryReset(15, "2026-04-14T10:00:00.000Z")).toBe(true);
  });

  it("returns false when today is payday but lastReset is today (already done)", () => {
    expect(needsSalaryReset(15, "2026-04-15T01:00:00.000Z")).toBe(false);
  });

  it("returns false when today is NOT payday (day 20, today is 15)", () => {
    expect(needsSalaryReset(20, null)).toBe(false);
  });

  it("returns false when paydayDay is null regardless of lastReset", () => {
    expect(needsSalaryReset(null, null)).toBe(false);
    expect(needsSalaryReset(null, "2026-04-14T10:00:00.000Z")).toBe(false);
  });

  it("returns false when today is not payday even if lastReset is old", () => {
    expect(needsSalaryReset(1, "2026-01-01T00:00:00.000Z")).toBe(false);
  });
});

// ─── isDataStale ─────────────────────────────────────────────────────────────

describe("isDataStale", () => {
  beforeEach(pinToday); // Today = April 2026
  afterEach(restoreDate);

  it("returns false when lastReset is null (never set up = not stale)", () => {
    expect(isDataStale(null)).toBe(false);
  });

  it("returns false when lastReset was today", () => {
    expect(isDataStale("2026-04-15T06:00:00.000Z")).toBe(false);
  });

  it("returns false when lastReset was 1 month ago", () => {
    expect(isDataStale("2026-03-15T06:00:00.000Z")).toBe(false);
  });

  it("returns false when lastReset was exactly 1 month ago", () => {
    expect(isDataStale("2026-03-15T00:00:00.000Z")).toBe(false);
  });

  it("returns true when lastReset was exactly 2 months ago", () => {
    // Feb 15 → April 15 = 2 months
    expect(isDataStale("2026-02-15T00:00:00.000Z")).toBe(true);
  });

  it("returns true when lastReset was 3 months ago", () => {
    expect(isDataStale("2026-01-15T00:00:00.000Z")).toBe(true);
  });

  it("returns true when lastReset was from last year", () => {
    expect(isDataStale("2025-01-01T00:00:00.000Z")).toBe(true);
  });

  it("returns false for data 1 month and 29 days old (< 2 months)", () => {
    // March 16 → April 15 = ~30 days = ~1 month
    expect(isDataStale("2026-03-16T00:00:00.000Z")).toBe(false);
  });
});

// ─── computeCashFlowProjection — full integration scenario ───────────────────

describe("computeCashFlowProjection — real-world scenarios", () => {
  beforeEach(pinToday); // April 15, 2026
  afterEach(restoreDate);

  /**
   * Scenario: Employee, paid on the 1st, sets up on April 1.
   * Today is April 15 → 14 days of data.
   * Balance: GHS 2,500
   * Recurring: Rent GHS 800/month, Utility GHS 100/month
   * Variable spending: GHS 420 over 14 days
   */
  it("realistic salary worker scenario", () => {
    const balance = 2500;
    const recurringExpenses = [
      { amount: 800, frequency: "monthly" as const, isActive: true },
      { amount: 100, frequency: "monthly" as const, isActive: true },
    ];
    const transactions = makeTxs(420);

    const result = computeCashFlowProjection(
      balance,
      transactions,
      recurringExpenses,
      "2026-04-01"
    );

    // Apr01→Apr15 = 14 days; fixedMonthly=900; variableTotal=420
    // burnRate = (900 + 420 × 30/14) / 30 = (900 + 900) / 30 = 60/day
    expect(result.dailyBurnRate).toBeCloseTo(60, 1);
    expect(result.sufficiency).toBe("full");

    // daysUntilRunOut = floor(2500 / 60) = 41
    expect(result.daysUntilRunOut).toBe(41);

    // remainingDaysInMonth = 15 (Apr15 00:00 → Apr30 00:00)
    // safeToSpend = 2500 - (60 × 15) = 1600
    expect(result.safeToSpendToday).toBeCloseTo(1600, 0);
    expect(result.isNegative).toBe(false);
  });

  /**
   * Scenario: User who is clearly going to run out within 7 days.
   * Balance: GHS 200, burnRate should be high.
   */
  it("critical run-out scenario: user runs out within 7 days", () => {
    // dataDays=14, variable=700 → burnRate=50/day
    // balance=200 → daysUntilRunOut=floor(200/50)=4
    const result = computeCashFlowProjection(200, makeTxs(700), noExpenses, "2026-04-01");
    expect(result.daysUntilRunOut).toBe(4);
    expect(result.daysUntilRunOut).toBeLessThanOrEqual(7);
    expect(result.isNegative).toBe(true); // 200 - 50*15 < 0
  });

  /**
   * Scenario: New user just set up, only 3 days of data (warmup).
   * Should show warmup qualifier.
   */
  it("new user with only 3 days of data (warmup)", () => {
    // Apr12 00:00 → Apr15 00:00 = exactly 3 days → warmup
    const result = computeCashFlowProjection(3000, makeTxs(150), noExpenses, "2026-04-12");
    expect(result.sufficiency).toBe("warmup");
    // burnRate = (0 + 150 × 30/3) / 30 = 50/day
    expect(result.dailyBurnRate).toBeCloseTo(50, 2);
  });

  /**
   * Scenario: User with irregular spending (multiple transactions, big amounts).
   */
  it("handles multiple transactions with varying amounts correctly", () => {
    const transactions = [
      { amount: 300, occurredAt: "2026-04-02T10:00:00.000Z" },
      { amount: 50, occurredAt: "2026-04-05T10:00:00.000Z" },
      { amount: 150, occurredAt: "2026-04-10T10:00:00.000Z" },
      { amount: 200, occurredAt: "2026-04-12T10:00:00.000Z" },
    ];
    // Total = 700 over 14 days (Apr01→Apr15) → burnRate = 700/14 = 50/day
    const result = computeCashFlowProjection(2000, transactions, noExpenses, "2026-04-01");
    expect(result.dailyBurnRate).toBeCloseTo(50, 2);
    expect(result.sufficiency).toBe("full");
  });
});
