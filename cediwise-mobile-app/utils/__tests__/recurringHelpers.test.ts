import type { RecurringExpense } from "../../types/budget";
import {
  filterEffectiveRecurringExpenses,
  isValidISODate,
  parseOptionalRecurringEndDateYmd,
  recurringExpenseEffectiveOnDate,
  sumRecurringMonthlyEquivalent,
  toMonthlyEquivalentAmount,
} from "../recurringHelpers";

describe("parseOptionalRecurringEndDateYmd / isValidISODate", () => {
  it("accepts empty and null as null", () => {
    expect(parseOptionalRecurringEndDateYmd("")).toEqual({
      ok: true,
      value: null,
    });
    expect(parseOptionalRecurringEndDateYmd("   ")).toEqual({
      ok: true,
      value: null,
    });
    expect(parseOptionalRecurringEndDateYmd(null)).toEqual({
      ok: true,
      value: null,
    });
    expect(parseOptionalRecurringEndDateYmd(undefined)).toEqual({
      ok: true,
      value: null,
    });
  });

  it("rejects wrong shape", () => {
    expect(parseOptionalRecurringEndDateYmd("10-01-2026").ok).toBe(false);
    expect(parseOptionalRecurringEndDateYmd("2026-1-05").ok).toBe(false);
    expect(parseOptionalRecurringEndDateYmd("2026-01-5").ok).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(parseOptionalRecurringEndDateYmd("2026-02-30").ok).toBe(false);
    expect(parseOptionalRecurringEndDateYmd("2026-13-01").ok).toBe(false);
  });

  it("accepts valid YYYY-MM-DD", () => {
    expect(parseOptionalRecurringEndDateYmd("2026-02-28")).toEqual({
      ok: true,
      value: "2026-02-28",
    });
    expect(isValidISODate("2026-02-28")).toBe(true);
  });

  it("isValidISODate is false for empty", () => {
    expect(isValidISODate("")).toBe(false);
  });
});

describe("toMonthlyEquivalentAmount", () => {
  it("uses 52/12 for weekly", () => {
    expect(toMonthlyEquivalentAmount(12, "weekly")).toBeCloseTo(52, 5);
  });

  it("uses 26/12 for bi_weekly", () => {
    expect(toMonthlyEquivalentAmount(24, "bi_weekly")).toBeCloseTo(52, 5);
  });

  it("normalizes quarterly and annual", () => {
    expect(toMonthlyEquivalentAmount(300, "quarterly")).toBe(100);
    expect(toMonthlyEquivalentAmount(1200, "annually")).toBe(100);
  });
});

function makeExp(partial: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: "1",
    userId: "u",
    name: "Test",
    amount: 100,
    frequency: "monthly",
    bucket: "needs",
    startDate: "2020-01-01",
    endDate: null,
    isActive: true,
    autoAllocate: false,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("recurringExpenseEffectiveOnDate", () => {
  const ref = new Date("2024-06-15T12:00:00.000Z");

  it("excludes when endDate before ref", () => {
    const e = makeExp({ endDate: "2024-06-01" });
    expect(recurringExpenseEffectiveOnDate(e, ref)).toBe(false);
  });

  it("includes when endDate on or after ref day", () => {
    const e = makeExp({ endDate: "2024-06-15" });
    expect(recurringExpenseEffectiveOnDate(e, ref)).toBe(true);
  });
});

describe("sumRecurringMonthlyEquivalent", () => {
  it("sums only effective rows", () => {
    const rows = [
      makeExp({ id: "a", amount: 30, frequency: "weekly" }),
      makeExp({ id: "b", isActive: false, amount: 1000 }),
    ];
    const sum = sumRecurringMonthlyEquivalent(rows, new Date("2024-06-15"));
    expect(sum).toBeCloseTo((30 * 52) / 12, 5);
  });
});

describe("filterEffectiveRecurringExpenses", () => {
  it("drops inactive", () => {
    const rows = [makeExp({ isActive: false })];
    expect(filterEffectiveRecurringExpenses(rows)).toHaveLength(0);
  });
});
