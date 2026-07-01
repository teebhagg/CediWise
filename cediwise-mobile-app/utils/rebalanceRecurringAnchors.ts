import { expenseLabelsMatch, normalizeExpenseLabel } from "@/components/features/vitals/expenseMatchingCore";
import type { BudgetCategory, RecurringExpense } from "@/types/budget";
import {
  filterEffectiveRecurringExpenses,
  toMonthlyEquivalentAmount,
} from "@/utils/recurringHelpers";

const UTILITY_CATEGORY_NAMES = new Set(["ecg", "ghana water", "utilities"]);

export function isUtilityCategoryName(name: string): boolean {
  return UTILITY_CATEGORY_NAMES.has(name.trim().toLowerCase());
}

export function isUtilityRecurringExpense(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (n === "utilities" || n === "utility" || n === "essential bills") {
    return true;
  }
  if (
    (n.includes("utilities") || n.includes("utility")) &&
    !n.includes("ecg") &&
    !n.includes("electric") &&
    !n.includes("water")
  ) {
    return true;
  }
  return false;
}

export type RecurringAnchorResult = {
  /** categoryId → monthly amount from recurring */
  fixedByCategoryId: Map<string, number>;
  lockedCategoryIds: Set<string>;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Avoid ECG ↔ Ghana Water cross-match via shared "utilities" aliases. */
function matchesRecurringToCategory(
  expenseName: string,
  cat: BudgetCategory,
): boolean {
  if (
    normalizeExpenseLabel(expenseName) === normalizeExpenseLabel(cat.name)
  ) {
    return true;
  }

  const catNorm = cat.name.trim().toLowerCase();
  const expNorm = expenseName.trim().toLowerCase();

  if (catNorm === "ecg") {
    return (
      expNorm.includes("ecg") ||
      expNorm.includes("electric") ||
      expNorm === "utilities"
    );
  }
  if (catNorm === "ghana water") {
    return (
      expNorm.includes("ghana water") ||
      (expNorm.includes("water") &&
        !expNorm.includes("ecg") &&
        !expNorm.includes("electric"))
    );
  }
  if (catNorm === "utilities") {
    return isUtilityRecurringExpense(expenseName);
  }

  return expenseLabelsMatch(expenseName, cat.name);
}

function resolveRecurringTargets(
  exp: RecurringExpense,
  categories: BudgetCategory[],
  monthly: number,
): { categoryId: string; amount: number }[] {
  const bucketCats = categories.filter(
    (c) => c.bucket === exp.bucket && !c.isArchived,
  );

  if (exp.categoryId) {
    const byId = bucketCats.find((c) => c.id === exp.categoryId);
    if (byId) return [{ categoryId: byId.id, amount: monthly }];
  }

  if (isUtilityRecurringExpense(exp.name)) {
    const utilityCats = bucketCats.filter((c) => isUtilityCategoryName(c.name));
    if (utilityCats.length === 1) {
      return [{ categoryId: utilityCats[0].id, amount: monthly }];
    }
    if (utilityCats.length >= 2) {
      const ecg = utilityCats.find(
        (c) => c.name.trim().toLowerCase() === "ecg",
      );
      const water = utilityCats.find(
        (c) => c.name.trim().toLowerCase() === "ghana water",
      );
      if (ecg && water) {
        return [
          { categoryId: ecg.id, amount: roundMoney(monthly * (4 / 7)) },
          { categoryId: water.id, amount: roundMoney(monthly * (3 / 7)) },
        ];
      }
      const share = monthly / utilityCats.length;
      return utilityCats.map((c) => ({
        categoryId: c.id,
        amount: roundMoney(share),
      }));
    }
  }

  for (const cat of bucketCats) {
    if (matchesRecurringToCategory(exp.name, cat)) {
      return [{ categoryId: cat.id, amount: monthly }];
    }
  }

  const normalized = exp.name.trim().toLowerCase();
  for (const cat of bucketCats) {
    const catNorm = cat.name.trim().toLowerCase();
    if (catNorm.includes(normalized) || normalized.includes(catNorm)) {
      return [{ categoryId: cat.id, amount: monthly }];
    }
  }

  return [];
}

/**
 * Map effective recurring expenses to category limits (recurring-first rebalance).
 */
export function buildRecurringAnchors(
  categories: BudgetCategory[],
  recurringExpenses: RecurringExpense[],
  date = new Date(),
): RecurringAnchorResult {
  const fixedByCategoryId = new Map<string, number>();
  const lockedCategoryIds = new Set<string>();

  for (const exp of filterEffectiveRecurringExpenses(recurringExpenses, date)) {
    const monthly = toMonthlyEquivalentAmount(exp.amount, exp.frequency);
    if (monthly <= 0) continue;

    const targets = resolveRecurringTargets(exp, categories, monthly);
    for (const { categoryId, amount } of targets) {
      fixedByCategoryId.set(
        categoryId,
        roundMoney((fixedByCategoryId.get(categoryId) ?? 0) + amount),
      );
      lockedCategoryIds.add(categoryId);
    }
  }

  return { fixedByCategoryId, lockedCategoryIds };
}
