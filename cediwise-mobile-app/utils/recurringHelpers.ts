import type {
  BudgetBucket,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "../types/budget";

/** Canonical per-period → monthly conversion (52/12, 26/12). */
export function toMonthlyEquivalentAmount(
  amount: number,
  frequency: RecurringExpenseFrequency,
): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "bi_weekly":
      return (amount * 26) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "annually":
      return amount / 12;
    default:
      return amount;
  }
}

export function recurringExpenseEffectiveOnDate(
  expense: RecurringExpense,
  date: Date = new Date(),
): boolean {
  if (!expense.isActive) return false;
  const day = date.toISOString().slice(0, 10);
  if (expense.startDate && expense.startDate > day) return false;
  if (expense.endDate && expense.endDate < day) return false;
  return true;
}

export function filterEffectiveRecurringExpenses(
  expenses: RecurringExpense[],
  date?: Date,
): RecurringExpense[] {
  const d = date ?? new Date();
  return expenses.filter((e) => recurringExpenseEffectiveOnDate(e, d));
}

export function sumRecurringMonthlyEquivalent(
  expenses: RecurringExpense[],
  date?: Date,
): number {
  return filterEffectiveRecurringExpenses(expenses, date).reduce(
    (sum, e) => sum + toMonthlyEquivalentAmount(e.amount, e.frequency),
    0,
  );
}

export function recurringTotalsByBucket(
  expenses: RecurringExpense[],
  date?: Date,
): Record<BudgetBucket, number> {
  const out: Record<BudgetBucket, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  for (const e of filterEffectiveRecurringExpenses(expenses, date ?? new Date())) {
    out[e.bucket] += toMonthlyEquivalentAmount(e.amount, e.frequency);
  }
  return out;
}
