import type { BudgetBucket, BudgetCategory } from "@/types/budget";
import type {
  FinancialPriority,
  LifeStage,
  SpendingStyle,
} from "@/calculators/budget-intelligence";
import { expenseLabelsMatch } from "@/components/features/vitals/expenseMatchingCore";

export type CategoryProfileContext = {
  lifeStage?: LifeStage | null;
  spendingStyle?: SpendingStyle | null;
  financialPriority?: FinancialPriority | null;
  interests?: string[];
  spentByCategoryId?: Record<string, number>;
  lockedCategoryIds?: Set<string>;
};

/** Categories typically not relevant unless user has recurring, spend, or manual limits. */
const LIFE_STAGE_LOW_RELEVANCE: Partial<Record<LifeStage, string[]>> = {
  young_professional: ["Childcare", "Family Outings", "Education Fund"],
  student: ["Childcare", "Family Outings", "Healthcare Reserve"],
  family: ["Childcare", "Education Fund"],
  retiree: [
    "Childcare",
    "Family Outings",
    "Skills & Courses",
    "Gadgets",
  ],
};

const INTEREST_WANTS_MAP: Record<string, string[]> = {
  Tech: ["Subscriptions", "Gadgets"],
  Fashion: ["Clothing", "Shoes & Accessories"],
  Fitness: ["Gym", "Supplements"],
  Food: ["Dining Out"],
  Travel: ["Travel"],
  Gaming: ["Games"],
  Music: ["Entertainment"],
  Business: ["Skills & Courses"],
  Beauty: ["Self-care"],
};

function namesMatch(a: string, b: string): boolean {
  return (
    a.trim().toLowerCase() === b.trim().toLowerCase() ||
    expenseLabelsMatch(a, b)
  );
}

export function isSchoolFeesCategoryName(name: string): boolean {
  return namesMatch(name, "School Fees");
}

/**
 * School fees apply only to students. Removed for young professionals,
 * families, retirees, and when life stage is unknown.
 */
export function isSchoolFeesExcludedForLifeStage(
  lifeStage: LifeStage | null | undefined,
): boolean {
  return lifeStage !== "student";
}

function isLowRelevanceForLifeStage(
  categoryName: string,
  lifeStage: LifeStage | null | undefined,
): boolean {
  if (!lifeStage) return false;
  const list = LIFE_STAGE_LOW_RELEVANCE[lifeStage];
  if (!list) return false;
  return list.some((label) => namesMatch(categoryName, label));
}

function isInterestAlignedWant(
  categoryName: string,
  interests?: string[],
): boolean {
  if (!interests?.length) return true;
  const aligned = new Set<string>();
  for (const interest of interests) {
    for (const name of INTEREST_WANTS_MAP[interest] ?? []) {
      aligned.add(name.toLowerCase());
    }
  }
  aligned.add("data bundles");
  aligned.add("others");
  const normalized = categoryName.trim().toLowerCase();
  if (aligned.has(normalized)) return true;
  return [...aligned].some(
    (name) => normalized.includes(name) || name.includes(normalized),
  );
}

/**
 * Whether a category should receive flexible allocation for this profile.
 * Recurring locks, manual limits, and active spend always win.
 */
export function isCategoryRelevantForProfile(
  categoryName: string,
  bucket: BudgetBucket,
  ctx: CategoryProfileContext,
  category?: Pick<BudgetCategory, "id" | "manualOverride" | "limitAmount">,
): boolean {
  const lifeStage = ctx.lifeStage ?? null;

  if (
    isSchoolFeesCategoryName(categoryName) &&
    isSchoolFeesExcludedForLifeStage(lifeStage)
  ) {
    return (
      !!category?.id && !!ctx.lockedCategoryIds?.has(category.id)
    );
  }

  if (category?.id && ctx.lockedCategoryIds?.has(category.id)) {
    return true;
  }
  if (category?.manualOverride && (category.limitAmount ?? 0) > 0) {
    return true;
  }
  if (
    category?.id &&
    (ctx.spentByCategoryId?.[category.id] ?? 0) > 0.001
  ) {
    return true;
  }

  if (isLowRelevanceForLifeStage(categoryName, lifeStage)) {
    return false;
  }

  if (bucket === "wants" && ctx.interests?.length) {
    if (!isInterestAlignedWant(categoryName, ctx.interests)) {
      return false;
    }
  }

  if (
    ctx.financialPriority === "debt_payoff" &&
    bucket === "wants" &&
    namesMatch(categoryName, "Dining Out")
  ) {
    return false;
  }

  if (
    ctx.financialPriority === "savings_growth" &&
    bucket === "wants" &&
    (namesMatch(categoryName, "Entertainment") ||
      namesMatch(categoryName, "Dining Out"))
  ) {
    return false;
  }

  return true;
}

/** Weight multiplier from spending style + financial priority (on top of life-stage weights). */
export function getProfileWeightMultiplier(
  categoryName: string,
  bucket: BudgetBucket,
  ctx: CategoryProfileContext,
): number {
  let multiplier = 1;

  if (ctx.spendingStyle === "conservative" && bucket === "wants") {
    multiplier *= 0.85;
  }
  if (ctx.spendingStyle === "liberal" && bucket === "wants") {
    multiplier *= 1.1;
  }
  if (ctx.financialPriority === "savings_growth" && bucket === "savings") {
    multiplier *= 1.15;
  }
  if (ctx.financialPriority === "lifestyle" && bucket === "wants") {
    multiplier *= 1.12;
  }
  if (
    ctx.financialPriority === "debt_payoff" &&
    bucket === "needs" &&
    namesMatch(categoryName, "Debt Payments")
  ) {
    multiplier *= 1.2;
  }
  if (lifeStageBoostsDataBundles(ctx.lifeStage) && namesMatch(categoryName, "Data Bundles")) {
    multiplier *= 1.1;
  }

  return multiplier;
}

function lifeStageBoostsDataBundles(
  lifeStage: LifeStage | null | undefined,
): boolean {
  return lifeStage === "student" || lifeStage === "young_professional";
}

export function formatProfileRelevanceNote(
  ctx: CategoryProfileContext,
): string | undefined {
  const bits: string[] = [];
  if (ctx.lifeStage) {
    bits.push(ctx.lifeStage.replace(/_/g, " "));
  }
  if (ctx.financialPriority) {
    bits.push(ctx.financialPriority.replace(/_/g, " "));
  }
  if (bits.length === 0) return undefined;
  return `Based on your ${bits.join(" · ")} profile.`;
}
