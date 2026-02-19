/**
 * Budget Builder Calculator
 * Uses 50/30/20 rule as default. For educational purposes only.
 */

export type BudgetAllocation = {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

export type BudgetBuilderInput = {
  monthlyIncome: number;
  /** Override default 50/30/20. Must sum to 1. */
  allocation?: Partial<BudgetAllocation>;
};

export type BudgetBuilderResult = {
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

const DEFAULT_ALLOCATION: BudgetAllocation = {
  needsPct: 0.5,
  wantsPct: 0.3,
  savingsPct: 0.2,
};

export function calculateBudget(
  input: BudgetBuilderInput
): BudgetBuilderResult {
  const { monthlyIncome } = input;
  const allocation = {
    ...DEFAULT_ALLOCATION,
    ...input.allocation,
  };

  const sum =
    (allocation.needsPct ?? 0) +
    (allocation.wantsPct ?? 0) +
    (allocation.savingsPct ?? 0);
  const needsPct = sum > 0 ? (allocation.needsPct ?? 0) / sum : 1 / 3;
  const wantsPct = sum > 0 ? (allocation.wantsPct ?? 0) / sum : 1 / 3;
  const savingsPct = sum > 0 ? (allocation.savingsPct ?? 0) / sum : 1 / 3;

  const needsAmount = Math.round(monthlyIncome * needsPct * 100) / 100;
  const wantsAmount = Math.round(monthlyIncome * wantsPct * 100) / 100;
  const savingsAmount = Math.round(monthlyIncome * savingsPct * 100) / 100;

  return {
    needsAmount,
    wantsAmount,
    savingsAmount,
    needsPct,
    wantsPct,
    savingsPct,
  };
}
