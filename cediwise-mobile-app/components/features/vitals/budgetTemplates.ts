import type { PersonalizationStrategy } from "@/utils/profileVitals";

import type {
  BudgetTemplateKey,
  FinancialPriority,
  LifeStage,
  SpendingStyle,
} from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BudgetTemplate = {
  key: BudgetTemplateKey;
  /** Display name, e.g. "50 / 30 / 20" or "Smart Split" */
  name: string;
  /** One-line description shown on the card */
  tagline: string;
  /**
   * Decimals (0.0–1.0). Null only for "smart" — percentages come from
   * computeIntelligentStrategy at runtime.
   */
  needsPct: number | null;
  wantsPct: number | null;
  savingsPct: number | null;
  /** Key into STRATEGY_META for the strategy badge (display only). */
  strategyKey: string;
  /**
   * The PersonalizationStrategy value written to the database.
   * Null only for "smart" — falls back to computeIntelligentStrategy's result.
   * Kept separate from strategyKey because "moderate" and "custom" are display
   * concepts that do not exist in the DB enum.
   */
  strategyForDb: PersonalizationStrategy | null;
};

// ─── Template definitions ─────────────────────────────────────────────────────

export const BUDGET_TEMPLATE_LIST: BudgetTemplate[] = [
  {
    key: "smart",
    name: "Smart Split",
    tagline: "Personalised for your income & lifestyle",
    needsPct: null,
    wantsPct: null,
    savingsPct: null,
    strategyKey: "custom",
    strategyForDb: null, // uses computeIntelligentStrategy output
  },
  {
    key: "balanced",
    name: "50 / 30 / 20",
    tagline: "The classic — Needs · Wants · Savings",
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    strategyKey: "balanced",
    strategyForDb: "balanced",
  },
  {
    key: "moderate",
    name: "60 / 20 / 20",
    tagline: "Higher needs, equal fun and savings",
    needsPct: 0.6,
    wantsPct: 0.2,
    savingsPct: 0.2,
    strategyKey: "moderate",
    strategyForDb: "balanced", // "moderate" has no DB enum value; maps to balanced
  },
  {
    key: "survival",
    name: "70 / 20 / 10",
    tagline: "Essentials first — tight budget phase",
    needsPct: 0.7,
    wantsPct: 0.2,
    savingsPct: 0.1,
    strategyKey: "survival",
    strategyForDb: "survival",
  },
  {
    key: "aggressive_savings",
    name: "40 / 20 / 40",
    tagline: "Live lean today, build wealth fast",
    needsPct: 0.4,
    wantsPct: 0.2,
    savingsPct: 0.4,
    strategyKey: "aggressive",
    strategyForDb: "aggressive",
  },
];

export const BUDGET_TEMPLATES: Record<BudgetTemplateKey, BudgetTemplate> =
  Object.fromEntries(
    BUDGET_TEMPLATE_LIST.map((t) => [t.key, t]),
  ) as Record<BudgetTemplateKey, BudgetTemplate>;

// ─── Recommendation engine ────────────────────────────────────────────────────

/**
 * Selects the most suitable predefined template based on user profile data.
 * Returns a specific template key (never "smart") so the UI can highlight it.
 *
 * Rules (in priority order):
 *   1. Savings-growth + conservative → aggressive savings
 *   2. Debt payoff or student → survival (maximise cash flow)
 *   3. Family or retiree → moderate (higher fixed costs)
 *   4. Lifestyle priority or liberal spender → balanced
 *   5. Savings-growth (non-conservative) → aggressive savings
 *   6. Default → balanced
 */
export function recommendBudgetTemplate(
  lifeStage: LifeStage | null,
  spendingStyle: SpendingStyle | null,
  financialPriority: FinancialPriority | null,
): Exclude<BudgetTemplateKey, "smart"> {
  if (financialPriority === "savings_growth" && spendingStyle !== "liberal") {
    return "aggressive_savings";
  }
  if (financialPriority === "debt_payoff" || lifeStage === "student") {
    return "survival";
  }
  if (lifeStage === "family" || lifeStage === "retiree") {
    return "moderate";
  }
  if (financialPriority === "lifestyle" || spendingStyle === "liberal") {
    return "balanced";
  }
  if (financialPriority === "savings_growth") {
    return "aggressive_savings";
  }
  return "balanced";
}
