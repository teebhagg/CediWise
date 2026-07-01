import type { BudgetBucket, BudgetCategory, RecurringExpense } from "@/types/budget";
import {
  type LifeStage,
  type FinancialPriority,
  type SpendingStyle,
} from "@/calculators/budget-intelligence";
import { getCategoryWeight } from "@/calculators/category-weights";
import {
  isNeedsGeneralCategoryName,
  isWantsOthersCategoryName,
} from "@/utils/budgetCategorySeeding";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import {
  formatProfileRelevanceNote,
  isCategoryRelevantForProfile,
  isSchoolFeesCategoryName,
  isSchoolFeesExcludedForLifeStage,
  type CategoryProfileContext,
} from "@/utils/categoryProfileRelevance";
import { distributeWithinBuckets } from "@/utils/distributeWithinBuckets";
import {
  buildRecurringAnchors,
  isUtilityCategoryName,
} from "@/utils/rebalanceRecurringAnchors";
import {
  consolidateProposedDuplicates,
  redirectRecurringAnchors,
  resolveDuplicateCategories,
} from "@/utils/categoryOverlap";
import { formatCurrency } from "@/utils/formatCurrency";

export type RebalancePreviewRowKind =
  | "adjusted"
  | "duplicate_removed"
  | "profile_removed"
  | "deleted";

export type RebalancePreviewRow = {
  categoryId: string;
  name: string;
  bucket: BudgetBucket;
  current: number;
  proposed: number;
  locked: boolean;
  kind: RebalancePreviewRowKind;
  /** When duplicate_removed — the line that keeps this spending */
  mergedIntoName?: string;
  /** When adjusted — duplicate lines folded into this category */
  includesFromNames?: string[];
};

export type RebalancePreview = {
  rows: RebalancePreviewRow[];
  totalBefore: number;
  totalAfter: number;
  takeHome: number;
  /** Optional note when preferences, recurring, or AI shaped the plan */
  note?: string;
  usedAI?: boolean;
  lockedCategoryIds?: Set<string>;
  proposedByCategoryId?: Map<string, number>;
  mergeIntoWinner?: Map<string, string>;
  profileContext?: CategoryProfileContext;
  /** Categories to remove from the budget when applying (e.g. School Fees for non-students). */
  deleteCategoryIds?: string[];
};

export type RebalanceContext = {
  lifeStage?: LifeStage | null;
  spendingStyle?: SpendingStyle | null;
  financialPriority?: FinancialPriority | null;
  interests?: string[];
  spentByCategoryId?: Record<string, number>;
  preferredTrimCategoryIds?: Set<string>;
  recurringExpenses?: RecurringExpense[];
};

const DEFAULT_TRIM_BUCKET_ORDER: BudgetBucket[] = ["wants", "savings", "needs"];

function trimBucketOrder(ctx?: RebalanceContext): BudgetBucket[] {
  const priority = ctx?.financialPriority;
  if (priority === "savings_growth" || priority === "debt_payoff") {
    return ["wants", "savings", "needs"];
  }
  if (priority === "lifestyle") {
    return ["savings", "wants", "needs"];
  }
  return DEFAULT_TRIM_BUCKET_ORDER;
}

function isLockedCategory(
  cat: BudgetCategory,
  lockedCategoryIds: Set<string>,
): boolean {
  if (lockedCategoryIds.has(cat.id)) return true;
  if (cat.manualOverride && cat.limitAmount > 0) return true;
  return false;
}

function isProtectedFromTrim(
  cat: BudgetCategory,
  lockedCategoryIds: Set<string>,
): boolean {
  if (isLockedCategory(cat, lockedCategoryIds)) return true;
  if (isUtilityCategoryName(cat.name) && lockedCategoryIds.has(cat.id)) {
    return true;
  }
  if (isWantsOthersCategoryName(cat.bucket, cat.name)) return false;
  if (isNeedsGeneralCategoryName(cat.bucket, cat.name)) return false;
  return false;
}

/** Lower value = trimmed sooner (discretionary / underspent first). */
function trimOrder(
  cat: BudgetCategory,
  ctx?: RebalanceContext,
  profileCtx?: CategoryProfileContext,
): number {
  if (
    profileCtx &&
    !isCategoryRelevantForProfile(cat.name, cat.bucket, profileCtx, cat)
  ) {
    return -500;
  }
  if (isUtilityCategoryName(cat.name)) return 2000;
  if (isNeedsGeneralCategoryName(cat.bucket, cat.name)) return 1000;
  if (isWantsOthersCategoryName(cat.bucket, cat.name)) return 950;

  const lifeStage = ctx?.lifeStage ?? null;
  let order = getCategoryWeight(cat.name, cat.bucket, lifeStage);

  const spent = ctx?.spentByCategoryId?.[cat.id] ?? 0;
  const limit = cat.limitAmount;
  if (limit > 0) {
    const utilization = spent / limit;
    if (utilization < 0.3) order -= 0.5;
    if (utilization > 0.85) order += 0.5;
  }

  if (ctx?.preferredTrimCategoryIds?.has(cat.id)) order -= 0.4;

  if (ctx?.financialPriority === "savings_growth" && cat.bucket === "wants") {
    order -= 0.35;
  }
  if (ctx?.financialPriority === "lifestyle" && cat.bucket === "savings") {
    order -= 0.35;
  }
  if (ctx?.spendingStyle === "conservative" && cat.bucket === "wants") {
    order -= 0.25;
  }
  if (ctx?.spendingStyle === "liberal" && cat.bucket === "savings") {
    order -= 0.2;
  }

  return order;
}

/** User-facing label for a rebalance preview row (avoids opaque "→ ₵0"). */
export function formatRebalancePreviewRowLabel(row: RebalancePreviewRow): string {
  switch (row.kind) {
    case "duplicate_removed":
      return row.mergedIntoName
        ? `Duplicate · merged into ${row.mergedIntoName}`
        : "Duplicate · removed";
    case "profile_removed":
      return "Removed · not in your profile";
    case "deleted":
      return "Deleted · not in your profile";
    default: {
      const base = `₵${formatCurrency(row.current)} → ₵${formatCurrency(row.proposed)}`;
      if (row.includesFromNames?.length) {
        return `${base} · incl. ${row.includesFromNames.join(", ")}`;
      }
      return base;
    }
  }
}

function classifyRowChange(
  cat: BudgetCategory,
  current: number,
  next: number,
  mergeIntoWinner: Map<string, string>,
  profileCtx: CategoryProfileContext,
  deleteCategoryIds: Set<string>,
): RebalancePreviewRowKind {
  if (deleteCategoryIds.has(cat.id)) {
    return "deleted";
  }

  if (mergeIntoWinner.has(cat.id)) {
    return "duplicate_removed";
  }

  if (next <= 0.001 && current > 0.001) {
    if (
      isSchoolFeesCategoryName(cat.name) &&
      isSchoolFeesExcludedForLifeStage(profileCtx.lifeStage)
    ) {
      return "deleted";
    }
    if (!isCategoryRelevantForProfile(cat.name, cat.bucket, profileCtx, cat)) {
      return "profile_removed";
    }
  }

  return "adjusted";
}

function collectSchoolFeesToDelete(
  categories: BudgetCategory[],
  profileCtx: CategoryProfileContext,
  lockedCategoryIds: Set<string>,
): Set<string> {
  const ids = new Set<string>();
  if (!isSchoolFeesExcludedForLifeStage(profileCtx.lifeStage)) {
    return ids;
  }
  for (const cat of categories) {
    if (!isSchoolFeesCategoryName(cat.name)) continue;
    if (lockedCategoryIds.has(cat.id)) continue;
    ids.add(cat.id);
  }
  return ids;
}

function absorbedDuplicateNames(
  categoryId: string,
  categories: BudgetCategory[],
  mergeIntoWinner: Map<string, string>,
): string[] {
  const names: string[] = [];
  for (const [loserId, winnerId] of mergeIntoWinner) {
    if (winnerId !== categoryId) continue;
    const loser = categories.find((c) => c.id === loserId);
    if (loser) names.push(loser.name);
  }
  return names;
}

function buildRows(
  categories: BudgetCategory[],
  proposed: Map<string, number>,
  lockedCategoryIds: Set<string>,
  mergeIntoWinner: Map<string, string>,
  profileCtx: CategoryProfileContext,
  deleteCategoryIds: Set<string>,
): RebalancePreviewRow[] {
  const rows: RebalancePreviewRow[] = [];
  for (const cat of categories) {
    const current = cat.limitAmount;
    const next = deleteCategoryIds.has(cat.id)
      ? 0
      : (proposed.get(cat.id) ?? current);
    const isDeleted = deleteCategoryIds.has(cat.id);
    const changed = isDeleted || Math.abs(next - current) > 0.001;
    if (!changed) continue;

    const kind = classifyRowChange(
      cat,
      current,
      next,
      mergeIntoWinner,
      profileCtx,
      deleteCategoryIds,
    );
    const mergedIntoName = mergeIntoWinner.has(cat.id)
      ? categories.find((c) => c.id === mergeIntoWinner.get(cat.id))?.name
      : undefined;
    const includesFromNames = absorbedDuplicateNames(
      cat.id,
      categories,
      mergeIntoWinner,
    );
    rows.push({
      categoryId: cat.id,
      name: cat.name,
      bucket: cat.bucket,
      current,
      proposed: next,
      locked: isLockedCategory(cat, lockedCategoryIds),
      kind,
      mergedIntoName,
      includesFromNames:
        kind === "adjusted" && includesFromNames.length > 0
          ? includesFromNames
          : undefined,
    });
  }
  return rows;
}

function totalFromProposed(
  categories: BudgetCategory[],
  proposed: Map<string, number>,
  excludeCategoryIds?: Set<string>,
): number {
  return categories.reduce((s, cat) => {
    if (excludeCategoryIds?.has(cat.id)) return s;
    return s + (proposed.get(cat.id) ?? cat.limitAmount);
  }, 0);
}

function rowKey(bucket: BudgetBucket, name: string): string {
  return `${bucket}:${name}`;
}

function trimFlexibleOverflow(
  categories: BudgetCategory[],
  proposed: Map<string, number>,
  validation: BudgetPlanValidationResult,
  lockedCategoryIds: Set<string>,
  ctx?: RebalanceContext,
  profileCtx?: CategoryProfileContext,
): void {
  const takeHome = validation.takeHome;
  let overflow = totalFromProposed(categories, proposed) - takeHome;
  if (overflow <= 0.01) return;

  const tryTrim = (cat: BudgetCategory, amount: number) => {
    const current = proposed.get(cat.id) ?? cat.limitAmount;
    const minLimit =
      isUtilityCategoryName(cat.name) && lockedCategoryIds.has(cat.id)
        ? current
        : 0;
    const next = Math.max(minLimit, Math.round((current - amount) * 100) / 100);
    proposed.set(cat.id, next);
    return current - next;
  };

  for (const bucket of trimBucketOrder(ctx)) {
    if (overflow <= 0) break;
    const bucketOverflow =
      validation.buckets[bucket].overflow > 0
        ? validation.buckets[bucket].overflow
        : 0;
    let target = bucketOverflow > 0 ? bucketOverflow : overflow;

    const candidates = categories
      .filter((c) => c.bucket === bucket && !isProtectedFromTrim(c, lockedCategoryIds))
      .sort((a, b) => trimOrder(a, ctx, profileCtx) - trimOrder(b, ctx, profileCtx));

    for (const cat of candidates) {
      if (target <= 0 && overflow <= 0) break;
      const current = proposed.get(cat.id) ?? cat.limitAmount;
      if (current <= 0) continue;
      const cut = Math.min(current, Math.max(target, overflow));
      const trimmed = tryTrim(cat, cut);
      target -= trimmed;
      overflow -= trimmed;
    }
  }
}

/**
 * Rebalance preview: recurring bills first, then onboarding-style weighted
 * distribution within N/W/S envelopes, then optional flexible trim.
 */
export function buildRebalancePreview(
  categories: BudgetCategory[],
  validation: BudgetPlanValidationResult,
  ctx?: RebalanceContext,
): RebalancePreview {
  const takeHome = validation.takeHome;
  const bucketEnvelopes = {
    needs: validation.buckets.needs.envelope,
    wants: validation.buckets.wants.envelope,
    savings: validation.buckets.savings.envelope,
  };

  const { fixedByCategoryId, lockedCategoryIds } = buildRecurringAnchors(
    categories,
    ctx?.recurringExpenses ?? [],
  );

  for (const cat of categories) {
    if (cat.manualOverride && cat.limitAmount > 0) {
      lockedCategoryIds.add(cat.id);
      if (!fixedByCategoryId.has(cat.id)) {
        fixedByCategoryId.set(cat.id, cat.limitAmount);
      }
    }
  }

  const profileCtx: CategoryProfileContext = {
    lifeStage: ctx?.lifeStage ?? null,
    spendingStyle: ctx?.spendingStyle ?? null,
    financialPriority: ctx?.financialPriority ?? null,
    interests: ctx?.interests,
    spentByCategoryId: ctx?.spentByCategoryId,
    lockedCategoryIds,
  };

  const deleteCategoryIds = collectSchoolFeesToDelete(
    categories,
    profileCtx,
    lockedCategoryIds,
  );

  const { mergeIntoWinner } = resolveDuplicateCategories(
    categories.filter((c) => !deleteCategoryIds.has(c.id)),
    lockedCategoryIds,
  );

  redirectRecurringAnchors(fixedByCategoryId, lockedCategoryIds, mergeIntoWinner);

  const distributionInputs = categories.map((cat) => {
    const recurringFixed = fixedByCategoryId.get(cat.id);
    const locked = lockedCategoryIds.has(cat.id);
    const isMergedAway = mergeIntoWinner.has(cat.id);
    const isScheduledDelete = deleteCategoryIds.has(cat.id);
    const relevant = isCategoryRelevantForProfile(
      cat.name,
      cat.bucket,
      profileCtx,
      cat,
    );
    return {
      name: cat.name,
      bucket: cat.bucket,
      fixedAmount: recurringFixed,
      explicitLimit:
        isScheduledDelete || isMergedAway || (!relevant && !locked)
          ? 0
          : undefined,
      manualOverride:
        locked ||
        isMergedAway ||
        isScheduledDelete ||
        !relevant ||
        isNeedsGeneralCategoryName(cat.bucket, cat.name) ||
        (cat.bucket === "needs" &&
          cat.name.trim().toLowerCase() === "emergency"),
    };
  });

  const { limitsByKey } = distributeWithinBuckets({
    bucketEnvelopes,
    categories: distributionInputs,
    lifeStage: ctx?.lifeStage ?? null,
    profile: profileCtx,
  });

  const proposed = new Map<string, number>();
  for (const cat of categories) {
    const recurringFixed = fixedByCategoryId.get(cat.id);
    if (recurringFixed != null && lockedCategoryIds.has(cat.id)) {
      proposed.set(cat.id, Math.round(recurringFixed * 100) / 100);
      continue;
    }
    const distributed = limitsByKey.get(rowKey(cat.bucket, cat.name));
    proposed.set(cat.id, distributed ?? cat.limitAmount);
  }

  consolidateProposedDuplicates(categories, proposed, mergeIntoWinner);

  for (const id of deleteCategoryIds) {
    proposed.set(id, 0);
  }

  trimFlexibleOverflow(
    categories,
    proposed,
    validation,
    lockedCategoryIds,
    ctx,
    profileCtx,
  );

  const totalAfter = totalFromProposed(categories, proposed, deleteCategoryIds);
  const note = formatProfileRelevanceNote(profileCtx) ?? undefined;

  return {
    rows: buildRows(
      categories,
      proposed,
      lockedCategoryIds,
      mergeIntoWinner,
      profileCtx,
      deleteCategoryIds,
    ),
    totalBefore: validation.totalPlanned,
    totalAfter,
    takeHome,
    note,
    lockedCategoryIds,
    proposedByCategoryId: proposed,
    mergeIntoWinner,
    profileContext: profileCtx,
    deleteCategoryIds: [...deleteCategoryIds],
  };
}

export type AIRebalanceAdjustment = {
  categoryId: string;
  proposedLimit: number;
};

export type AIRebalanceResult = {
  adjustments: AIRebalanceAdjustment[];
  rationale?: string;
};

/** Merge AI-proposed limits (non-locked categories only). */
export function mergeAIRebalancePreview(
  categories: BudgetCategory[],
  base: RebalancePreview,
  ai: AIRebalanceResult,
  lockedCategoryIds?: Set<string>,
): RebalancePreview {
  const locked =
    lockedCategoryIds ?? base.lockedCategoryIds ?? new Set<string>();
  const proposed = new Map<string, number>();

  for (const cat of categories) {
    proposed.set(
      cat.id,
      base.proposedByCategoryId?.get(cat.id) ?? cat.limitAmount,
    );
  }

  for (const adj of ai.adjustments) {
    const cat = categories.find((c) => c.id === adj.categoryId);
    if (!cat || isProtectedFromTrim(cat, locked)) continue;
    proposed.set(
      adj.categoryId,
      Math.max(0, Math.round(adj.proposedLimit * 100) / 100),
    );
  }

  let totalAfter = totalFromProposed(categories, proposed);
  if (totalAfter > base.takeHome + 0.01) {
    let overflow = totalAfter - base.takeHome;
    const flexible = categories
      .filter((c) => !isProtectedFromTrim(c, locked))
      .sort((a, b) => trimOrder(a) - trimOrder(b));

    for (const cat of flexible) {
      if (overflow <= 0.01) break;
      const current = proposed.get(cat.id) ?? 0;
      const minLimit =
        isUtilityCategoryName(cat.name) && locked.has(cat.id) ? current : 0;
      const cut = Math.min(current - minLimit, overflow);
      if (cut <= 0) continue;
      proposed.set(
        cat.id,
        Math.max(minLimit, Math.round((current - cut) * 100) / 100),
      );
      overflow -= cut;
    }
    totalAfter = totalFromProposed(categories, proposed);
  }

  if (base.mergeIntoWinner?.size) {
    consolidateProposedDuplicates(categories, proposed, base.mergeIntoWinner);
    totalAfter = totalFromProposed(
      categories,
      proposed,
      new Set(base.deleteCategoryIds ?? []),
    );
  }

  const deleteIds = new Set(base.deleteCategoryIds ?? []);

  return {
    rows: buildRows(
      categories,
      proposed,
      locked,
      base.mergeIntoWinner ?? new Map(),
      base.profileContext ?? { lifeStage: null },
      deleteIds,
    ),
    totalBefore: base.totalBefore,
    totalAfter: totalFromProposed(categories, proposed, deleteIds),
    takeHome: base.takeHome,
    note: ai.rationale ?? base.note,
    usedAI: true,
    lockedCategoryIds: locked,
    proposedByCategoryId: proposed,
    mergeIntoWinner: base.mergeIntoWinner,
    profileContext: base.profileContext,
    deleteCategoryIds: base.deleteCategoryIds,
  };
}

export function applyRebalancePreview(
  categories: BudgetCategory[],
  preview: RebalancePreview,
): BudgetCategory[] {
  const deleteIds = new Set(preview.deleteCategoryIds ?? []);
  const byId = new Map(
    preview.rows
      .filter((r) => r.kind !== "deleted")
      .map((r) => [r.categoryId, r.proposed]),
  );
  const now = new Date().toISOString();
  return categories
    .filter((cat) => !deleteIds.has(cat.id))
    .map((cat) => {
      const next = byId.get(cat.id);
      if (next == null) return cat;
      return {
        ...cat,
        limitAmount: next,
        updatedAt: now,
      };
    });
}
