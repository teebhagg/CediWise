import type { RecurringExpense } from "../../types/budget";
import {
  filterEffectiveRecurringExpenses,
  recurringExpenseEffectiveOnDate,
  sumRecurringMonthlyEquivalent,
  toMonthlyEquivalentAmount,
} from "../recurringHelpers";

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
