/**
 * Template Auto-Matching Algorithm
 *
 * Scores budget templates against user profile to recommend the best fit.
 * Factors: life stage match, allocation distance, category overlap, target audience keywords.
 */

import type { BudgetTemplate } from "@/types/budget";

export type LifeStage = "student" | "young_professional" | "family" | "retiree";
export type FinancialPriority =
  | "debt_payoff"
  | "savings_growth"
  | "lifestyle"
  | "balanced";

export type UserProfileForMatching = {
  lifeStage?: LifeStage | null;
  financialPriority?: FinancialPriority | null;
  interests?: string[];
  /** Computed allocation from intelligent engine */
  idealAllocation?: { needsPct: number; wantsPct: number; savingsPct: number };
  /** Fixed cost ratio (0-1) - high = survival-ish */
  fixedCostRatio?: number;
  /** Debt-to-income ratio - high = debt crusher candidate */
  debtToIncomeRatio?: number;
};

export type ScoredTemplate = BudgetTemplate & {
  score: number;
  reasons: string[];
};

/**
 * Compute template match score (0-100) and human-readable reasons.
 */
export function matchTemplates(
  profile: UserProfileForMatching,
  templates: BudgetTemplate[]
): ScoredTemplate[] {
  return templates
    .map((t) => ({
      ...t,
      ...computeTemplateScore(profile, t),
    }))
    .sort((a, b) => b.score - a.score);
}

function computeTemplateScore(
  profile: UserProfileForMatching,
  template: BudgetTemplate
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Life stage match (0-40 points)
  const profileStage = profile.lifeStage;
  const templateStage = template.lifeStage ?? undefined;
  if (profileStage && templateStage) {
    if (profileStage === templateStage) {
      score += 40;
      reasons.push(`Matches your life stage (${formatStage(templateStage)}).`);
    } else if (isAdjacentStage(profileStage, templateStage)) {
      score += 15;
      reasons.push(
        `Relevant for similar life stage (${formatStage(templateStage)}).`
      );
    }
  } else if (templateStage && !profileStage) {
    score += 5;
  } else if (!templateStage) {
    score += 10;
    reasons.push("Flexible template for any life stage.");
  }

  // 2. Allocation distance (0-30 points) - how close template % to ideal
  if (profile.idealAllocation) {
    const dist = allocationDistance(profile.idealAllocation, {
      needsPct: template.needsPct,
      wantsPct: template.wantsPct,
      savingsPct: template.savingsPct,
    });
    const allocScore = Math.max(0, 30 - dist * 100);
    score += allocScore;
    if (allocScore > 20) {
      reasons.push("Allocation closely matches your financial profile.");
    }
  } else {
    score += 15;
  }

  // 3. Financial priority match (0-20 points)
  const priority = profile.financialPriority;
  if (
    priority === "debt_payoff" &&
    template.name.toLowerCase().includes("debt")
  ) {
    score += 20;
    reasons.push("Designed for debt payoff focus.");
  } else if (priority === "savings_growth" && template.savingsPct >= 0.25) {
    score += 15;
    reasons.push("Prioritizes savings growth.");
  } else if (
    profile.fixedCostRatio != null &&
    profile.fixedCostRatio >= 0.75 &&
    template.needsPct >= 0.85
  ) {
    score += 18;
    reasons.push("Suited for high fixed costs.");
  } else if (
    profile.debtToIncomeRatio != null &&
    profile.debtToIncomeRatio > 0.2 &&
    template.name.toLowerCase().includes("debt")
  ) {
    score += 15;
    reasons.push("Addresses your debt load.");
  }

  // 4. Category overlap with interests (0-10 points)
  if (profile.interests && profile.interests.length > 0) {
    const allRecCategories = [
      ...(template.recommendedCategories?.needs ?? []),
      ...(template.recommendedCategories?.wants ?? []),
      ...(template.recommendedCategories?.savings ?? []),
    ];
    const interestKeywords = [
      "Tech",
      "Fashion",
      "Fitness",
      "Food",
      "Travel",
      "Gaming",
      "Music",
      "Business",
      "Beauty",
    ];
    const overlap = profile.interests.filter(
      (i) =>
        interestKeywords.includes(i) &&
        allRecCategories.some((c) =>
          c.toLowerCase().includes(i.toLowerCase().slice(0, 4))
        )
    ).length;
    if (overlap > 0) {
      score += Math.min(10, overlap * 3);
      reasons.push(`Includes categories that match your interests.`);
    }
  }

  return {
    score: Math.round(Math.min(100, score)),
    reasons: reasons.length > 0 ? reasons : ["General purpose template."],
  };
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

function isAdjacentStage(a: LifeStage, b: LifeStage): boolean {
  const order: LifeStage[] = [
    "student",
    "young_professional",
    "family",
    "retiree",
  ];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1;
}

function allocationDistance(
  a: { needsPct: number; wantsPct: number; savingsPct: number },
  b: { needsPct: number; wantsPct: number; savingsPct: number }
): number {
  const dNeeds = Math.abs(a.needsPct - b.needsPct);
  const dWants = Math.abs(a.wantsPct - b.wantsPct);
  const dSavings = Math.abs(a.savingsPct - b.savingsPct);
  return (dNeeds + dWants + dSavings) / 2;
}

/**
 * Get the single best-matching template.
 */
export function getBestMatchingTemplate(
  profile: UserProfileForMatching,
  templates: BudgetTemplate[]
): ScoredTemplate | null {
  const scored = matchTemplates(profile, templates);
  return scored[0] ?? null;
}
