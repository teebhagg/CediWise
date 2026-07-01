import type { BudgetBucket, BudgetCategory } from "@/types/budget";
import {
  canonicalExpenseGroupKey,
  expenseLabelsMatch,
  normalizeExpenseLabel,
} from "@/components/features/vitals/expenseMatchingCore";
import { isUtilityCategoryName } from "@/utils/rebalanceRecurringAnchors";

/** Preferred seeded name per alias group when consolidating duplicates. */
const PREFERRED_CATEGORY_BY_GROUP: Record<string, string> = {
  databundles: "Data Bundles",
  groceries: "Groceries",
  rent: "Rent",
  transport: "Transport",
  diningout: "Dining Out",
  subscriptions: "Subscriptions",
  entertainment: "Entertainment",
  clothing: "Clothing",
  healthcare: "Healthcare",
  schoolfees: "School Fees",
  titheschurch: "Tithes/Church",
  debtpayments: "Debt Payments",
  savings: "Savings",
};

export type DuplicateCategoryResolution = {
  /** loser category id → winning category id */
  mergeIntoWinner: Map<string, string>;
  /** Human-readable pairs for UI / AI notes */
  mergedPairs: { loserName: string; winnerName: string; bucket: BudgetBucket }[];
};

function isDistinctUtilityLine(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "ecg" || n === "ghana water";
}

/** Standalone needs lines — never fold into utilities or other aliases. */
export function isStandaloneCategoryName(name: string): boolean {
  const n = normalizeExpenseLabel(name);
  return n === "trash" || n === "emergency";
}

/** Whether two categories in the same bucket are redundant allocations. */
export function categoriesOverlapForMerge(
  a: BudgetCategory,
  b: BudgetCategory,
): boolean {
  if (a.bucket !== b.bucket) return false;
  if (a.id === b.id) return false;

  if (isStandaloneCategoryName(a.name) || isStandaloneCategoryName(b.name)) {
    return normalizeExpenseLabel(a.name) === normalizeExpenseLabel(b.name);
  }

  if (normalizeExpenseLabel(a.name) === normalizeExpenseLabel(b.name)) {
    return true;
  }
  if (!expenseLabelsMatch(a.name, b.name)) return false;

  if (isUtilityCategoryName(a.name) && isUtilityCategoryName(b.name)) {
    if (isDistinctUtilityLine(a.name) && isDistinctUtilityLine(b.name)) {
      return false;
    }
  }

  return true;
}

function winnerScore(
  cat: BudgetCategory,
  lockedCategoryIds: Set<string>,
  groupKey: string,
): number {
  let score = 0;
  if (lockedCategoryIds.has(cat.id)) score += 10_000;
  if (cat.manualOverride && cat.limitAmount > 0) score += 5_000;
  const preferred = PREFERRED_CATEGORY_BY_GROUP[groupKey];
  if (
    preferred &&
    normalizeExpenseLabel(cat.name) === normalizeExpenseLabel(preferred)
  ) {
    score += 2_000;
  }
  score += cat.limitAmount;
  return score;
}

function pickGroupWinner(
  group: BudgetCategory[],
  lockedCategoryIds: Set<string>,
  groupKey: string,
): BudgetCategory {
  return [...group].sort(
    (a, b) =>
      winnerScore(b, lockedCategoryIds, groupKey) -
      winnerScore(a, lockedCategoryIds, groupKey),
  )[0];
}

/**
 * Find duplicate category lines (e.g. Data + Data Bundles) and pick a single winner.
 */
export function resolveDuplicateCategories(
  categories: BudgetCategory[],
  lockedCategoryIds: Set<string>,
): DuplicateCategoryResolution {
  const mergeIntoWinner = new Map<string, string>();
  const mergedPairs: DuplicateCategoryResolution["mergedPairs"] = [];
  const visited = new Set<string>();

  for (const cat of categories) {
    if (visited.has(cat.id)) continue;

    const group: BudgetCategory[] = [cat];
    for (const other of categories) {
      if (other.id === cat.id || visited.has(other.id)) continue;
      if (categoriesOverlapForMerge(cat, other)) {
        group.push(other);
      }
    }

    if (group.length < 2) continue;

    for (const member of group) visited.add(member.id);

    const groupKey = canonicalExpenseGroupKey(cat.name);
    const winner = pickGroupWinner(group, lockedCategoryIds, groupKey);

    for (const loser of group) {
      if (loser.id === winner.id) continue;
      mergeIntoWinner.set(loser.id, winner.id);
      mergedPairs.push({
        loserName: loser.name,
        winnerName: winner.name,
        bucket: loser.bucket,
      });
    }
  }

  return { mergeIntoWinner, mergedPairs };
}

/** Redirect recurring locks and fixed amounts from merged-away categories. */
export function redirectRecurringAnchors(
  fixedByCategoryId: Map<string, number>,
  lockedCategoryIds: Set<string>,
  mergeIntoWinner: Map<string, string>,
): void {
  for (const [loserId, winnerId] of mergeIntoWinner) {
    const amount = fixedByCategoryId.get(loserId);
    if (amount != null && amount > 0) {
      fixedByCategoryId.set(
        winnerId,
        Math.round(((fixedByCategoryId.get(winnerId) ?? 0) + amount) * 100) /
          100,
      );
      fixedByCategoryId.delete(loserId);
    }
    if (lockedCategoryIds.has(loserId)) {
      lockedCategoryIds.delete(loserId);
      lockedCategoryIds.add(winnerId);
    }
  }
}

/** Sum proposed limits from losers into winners; zero losers. */
export function consolidateProposedDuplicates(
  categories: BudgetCategory[],
  proposed: Map<string, number>,
  mergeIntoWinner: Map<string, string>,
): void {
  for (const [loserId, winnerId] of mergeIntoWinner) {
    const loserAmount = proposed.get(loserId) ?? 0;
    if (loserAmount <= 0) {
      proposed.set(loserId, 0);
      continue;
    }
    const winnerAmount = proposed.get(winnerId) ?? 0;
    proposed.set(
      winnerId,
      Math.round((winnerAmount + loserAmount) * 100) / 100,
    );
    proposed.set(loserId, 0);
  }
}

export function formatDuplicateMergeNote(
  mergedPairs: DuplicateCategoryResolution["mergedPairs"],
): string | undefined {
  if (mergedPairs.length === 0) return undefined;
  const samples = mergedPairs
    .slice(0, 3)
    .map((p) => `${p.loserName} → ${p.winnerName}`)
    .join(", ");
  const suffix = mergedPairs.length > 3 ? ` (+${mergedPairs.length - 3} more)` : "";
  return `Merged overlapping lines: ${samples}${suffix}.`;
}
