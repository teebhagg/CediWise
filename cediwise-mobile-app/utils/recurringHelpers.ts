import type {
  BudgetBucket,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "../types/budget";

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `ymd` is a non-empty YYYY-MM-DD string that exists on the calendar
 * (local date parts; no time zone shift).
 */
export function isValidISODate(ymd: string): boolean {
  const t = ymd.trim();
  if (!t) return false;
  const parsed = parseOptionalRecurringEndDateYmd(t);
  return parsed.ok && parsed.value !== null;
}

/**
 * Whitespace-only or null/undefined → ok with `value: null`.
 * Otherwise must match YYYY-MM-DD and be a real calendar date.
 */
export function parseOptionalRecurringEndDateYmd(
  raw: string | null | undefined,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: null };
  const t = String(raw).trim();
  if (!t) return { ok: true, value: null };
  if (!ISO_YMD.test(t)) {
    return {
      ok: false,
      error: "End date must be YYYY-MM-DD (e.g. 2026-12-31).",
    };
  }
  const y = Number(t.slice(0, 4));
  const mo = Number(t.slice(5, 7));
  const d = Number(t.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return { ok: false, error: "End date is not valid." };
  }
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return { ok: false, error: "That is not a valid calendar date." };
  }
  return { ok: true, value: t };
}

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
