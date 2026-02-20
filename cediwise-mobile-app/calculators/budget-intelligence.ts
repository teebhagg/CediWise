/**
 * Multi-Factor Budget Intelligence Engine
 *
 * Replaces the naive 3-tier threshold system with a weighted scoring approach
 * that considers life stage, financial priority, spending style, debt pressure,
 * dependents, and income stability. Grounded in behavioral economics research.
 */

import { computeGhanaTax2026Monthly } from "@/utils/ghanaTax";

export type LifeStage = "student" | "young_professional" | "family" | "retiree";
export type SpendingStyle = "conservative" | "moderate" | "liberal";
export type FinancialPriority =
  | "debt_payoff"
  | "savings_growth"
  | "lifestyle"
  | "balanced";

export type BudgetAllocation = {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

export type UserBudgetProfile = {
  /** Gross monthly salary */
  stableSalary: number;
  applyTax: boolean;
  sideIncome: number;
  rent: number;
  titheRemittance: number;
  debtObligations: number;
  utilitiesTotal: number;
  /** Minimum living buffer (groceries, transport basics) - defaults to 600 GHS */
  livingBuffer?: number;
  lifeStage?: LifeStage | null;
  dependentsCount?: number;
  incomeFrequency?: "weekly" | "bi_weekly" | "monthly";
  spendingStyle?: SpendingStyle | null;
  financialPriority?: FinancialPriority | null;
};

export type IntelligentAllocationResult = {
  allocation: BudgetAllocation;
  strategy: "survival" | "balanced" | "aggressive" | "custom";
  netIncome: number;
  fixedCosts: number;
  disposableIncome: number;
  fixedCostRatio: number;
  reasoning: string[];
};

const DEFAULT_LIVING_BUFFER = 600;

/**
 * Continuous curve: maps fixed cost ratio to base needs percentage.
 * Avoids cliff effect - smooth transition instead of hard 75%/35% thresholds.
 */
function fixedCostRatioToNeeds(ratio: number): number {
  if (ratio >= 0.85) return 0.92;
  if (ratio >= 0.75) return 0.75 + (ratio - 0.75) * 1.7; // 0.75 -> 0.90
  if (ratio >= 0.55) return 0.55 + (ratio - 0.55); // linear ramp
  if (ratio >= 0.35) return 0.45 + (ratio - 0.35) * 0.5; // 0.45 -> 0.55
  if (ratio >= 0.25) return 0.4;
  return 0.4; // floor for very low fixed costs
}

/** Life stage modifiers: (needs delta, wants delta, savings delta) in percentage points */
const LIFE_STAGE_MODIFIERS: Record<
  LifeStage,
  { needs: number; wants: number; savings: number }
> = {
  student: { needs: 8, wants: -5, savings: -3 },
  young_professional: { needs: 0, wants: 0, savings: 0 },
  family: { needs: 12, wants: -8, savings: -4 },
  retiree: { needs: 5, wants: 5, savings: -10 },
};

/** Financial priority modifiers */
const PRIORITY_MODIFIERS: Record<
  FinancialPriority,
  { needs: number; wants: number; savings: number }
> = {
  debt_payoff: { needs: 5, wants: -15, savings: 10 }, // savings redirected to debt
  savings_growth: { needs: 0, wants: -10, savings: 10 },
  lifestyle: { needs: -5, wants: 10, savings: -5 },
  balanced: { needs: 0, wants: 0, savings: 0 },
};

/** Spending style modifiers */
const STYLE_MODIFIERS: Record<
  SpendingStyle,
  { needs: number; wants: number; savings: number }
> = {
  conservative: { needs: 0, wants: -5, savings: 5 },
  moderate: { needs: 0, wants: 0, savings: 0 },
  liberal: { needs: 0, wants: 5, savings: -5 },
};

/**
 * Compute intelligent budget allocation using multi-factor scoring.
 * All percentages are 0..1 and sum to 1.
 */
export function computeIntelligentAllocation(
  profile: UserBudgetProfile
): IntelligentAllocationResult {
  const livingBuffer =
    typeof profile.livingBuffer === "number" && profile.livingBuffer >= 0
      ? profile.livingBuffer
      : DEFAULT_LIVING_BUFFER;

  const salaryNet = profile.applyTax
    ? computeGhanaTax2026Monthly(profile.stableSalary).netTakeHome
    : profile.stableSalary;
  const netIncome = Math.max(0, salaryNet + profile.sideIncome);
  const fixedCosts = Math.max(
    0,
    profile.rent +
      profile.titheRemittance +
      profile.debtObligations +
      profile.utilitiesTotal +
      livingBuffer
  );
  const fixedCostRatio = netIncome > 0 ? fixedCosts / netIncome : 1;
  const disposableIncome = Math.max(0, netIncome - fixedCosts);

  const reasoning: string[] = [];

  // 1. Base allocation from fixed cost ratio (continuous curve)
  let needsPct = fixedCostRatioToNeeds(fixedCostRatio);
  let wantsPct = (1 - needsPct) * 0.6; // default 60% of remainder to wants
  let savingsPct = (1 - needsPct) * 0.4; // 40% to savings

  // 2. Survival override: when fixed costs consume nearly everything
  if (fixedCostRatio >= 0.85) {
    needsPct = 0.92;
    wantsPct = 0.08;
    savingsPct = 0;
    reasoning.push(
      "Your fixed costs exceed 85% of income. Survival mode: minimal wants, focus on essentials."
    );
  } else if (fixedCostRatio >= 0.75) {
    reasoning.push(
      "High fixed costs. We've prioritized essentials while leaving some room for small wants."
    );
  } else if (fixedCostRatio < 0.35) {
    reasoning.push(
      "Low fixed costs give you flexibility. We've increased savings potential."
    );
  }

  // 3. Apply life stage modifier (percentage points)
  const lifeStage = profile.lifeStage ?? "young_professional";
  const lifeMod = LIFE_STAGE_MODIFIERS[lifeStage];
  needsPct += lifeMod.needs / 100;
  wantsPct += lifeMod.wants / 100;
  savingsPct += lifeMod.savings / 100;
  if (lifeStage !== "young_professional") {
    reasoning.push(
      `Life stage (${lifeStage.replace(
        "_",
        " "
      )}): adjusted for typical expenses.`
    );
  }

  // 4. Apply financial priority modifier
  const priority = profile.financialPriority ?? "balanced";
  const priorityMod = PRIORITY_MODIFIERS[priority];
  needsPct += priorityMod.needs / 100;
  wantsPct += priorityMod.wants / 100;
  savingsPct += priorityMod.savings / 100;
  if (priority !== "balanced") {
    reasoning.push(
      `Your priority (${priority.replace(
        "_",
        " "
      )}): allocation tuned accordingly.`
    );
  }

  // 5. Apply spending style modifier
  const style = profile.spendingStyle ?? "moderate";
  const styleMod = STYLE_MODIFIERS[style];
  needsPct += styleMod.needs / 100;
  wantsPct += styleMod.wants / 100;
  savingsPct += styleMod.savings / 100;

  // 6. Dependents pressure (each dependent adds ~2% to needs)
  const dependents = profile.dependentsCount ?? 0;
  if (dependents > 0) {
    const depMod = Math.min(dependents * 2, 10) / 100;
    needsPct += depMod;
    wantsPct -= depMod * 0.6;
    savingsPct -= depMod * 0.4;
    reasoning.push(`${dependents} dependent(s): increased needs allocation.`);
  }

  // 7. Debt pressure: DTI > 36% (research threshold) boosts needs, reduces wants
  const debtToIncome = netIncome > 0 ? profile.debtObligations / netIncome : 0;
  if (debtToIncome > 0.36) {
    const debtMod = 0.05;
    needsPct += debtMod;
    wantsPct -= debtMod;
    reasoning.push(
      "High debt burden: we've reduced wants to keep obligations manageable."
    );
  }

  // 8. Normalize to sum to 1
  const total = needsPct + wantsPct + savingsPct;
  needsPct = Math.max(0, Math.min(1, needsPct / total));
  wantsPct = Math.max(0, Math.min(1, wantsPct / total));
  savingsPct = Math.max(0, Math.min(1, savingsPct / total));

  const allocSum = needsPct + wantsPct + savingsPct;
  if (Math.abs(allocSum - 1) > 0.001) {
    const scale = 1 / allocSum;
    needsPct *= scale;
    wantsPct *= scale;
    savingsPct *= scale;
  }

  // Determine strategy label for display
  let strategy: IntelligentAllocationResult["strategy"] = "balanced";
  if (needsPct >= 0.85) strategy = "survival";
  else if (savingsPct >= 0.35 && wantsPct <= 0.25) strategy = "aggressive";
  else if (Math.abs(needsPct - 0.5) < 0.1) strategy = "balanced";
  else strategy = "custom";

  return {
    allocation: { needsPct, wantsPct, savingsPct },
    strategy,
    netIncome,
    fixedCosts,
    disposableIncome,
    fixedCostRatio,
    reasoning:
      reasoning.length > 0 ? reasoning : ["Standard allocation applied."],
  };
}

/**
 * Map legacy PersonalizationStrategy to allocation.
 * Used when user explicitly chose a strategy in vitals (e.g. "balanced").
 */
export function strategyToAllocation(
  strategy: "survival" | "balanced" | "aggressive"
): BudgetAllocation {
  switch (strategy) {
    case "survival":
      return { needsPct: 0.9, wantsPct: 0.1, savingsPct: 0 };
    case "aggressive":
      return { needsPct: 0.4, wantsPct: 0.2, savingsPct: 0.4 };
    default:
      return { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 };
  }
}
