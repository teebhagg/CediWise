/**
 * Savings Goal Planner
 * Calculates time to reach a savings target or monthly amount needed.
 * For educational purposes only.
 */

export type SavingsGoalInput = {
  /** Target amount (GHS) */
  targetAmount: number;
  /** Monthly contribution (GHS). If provided, we compute months. */
  monthlyContribution?: number;
  /** Number of months to reach goal. If provided with targetAmount, we compute monthly amount. */
  monthsToGoal?: number;
  /** Annual interest rate (0-1). Default 0. */
  annualInterestRate?: number;
};

export type SavingsGoalResult = {
  targetAmount: number;
  monthlyContribution: number;
  monthsToGoal: number;
  totalContributed: number;
  totalInterest: number;
  finalAmount: number;
};

/**
 * Simple savings calculation (no compounding for simplicity).
 * months = target / monthlyContribution when rate = 0.
 * With interest: uses simplified formula (linear approximation).
 */
export function calculateSavingsGoal(
  input: SavingsGoalInput
): SavingsGoalResult {
  const {
    targetAmount,
    monthlyContribution = 0,
    monthsToGoal = 0,
    annualInterestRate = 0,
  } = input;

  const monthlyRate = annualInterestRate / 12;

  if (monthlyContribution > 0 && targetAmount > 0) {
    // Compute months to reach target
    let balance = 0;
    let month = 0;
    const maxMonths = 600; // 50 years cap

    while (balance < targetAmount && month < maxMonths) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      month++;
    }

    const totalContributed = monthlyContribution * month;
    const totalInterest = Math.round((balance - totalContributed) * 100) / 100;

    return {
      targetAmount,
      monthlyContribution,
      monthsToGoal: month,
      totalContributed,
      totalInterest,
      finalAmount: Math.round(balance * 100) / 100,
    };
  }

  if (monthsToGoal > 0 && targetAmount > 0) {
    // Compute monthly contribution needed
    // Future value of annuity: FV = PMT * (((1+r)^n - 1) / r)
    // PMT = FV / (((1+r)^n - 1) / r)
    let monthlyContributionNeeded: number;
    if (monthlyRate > 0) {
      const factor =
        (Math.pow(1 + monthlyRate, monthsToGoal) - 1) / monthlyRate;
      monthlyContributionNeeded = targetAmount / factor;
    } else {
      monthlyContributionNeeded = targetAmount / monthsToGoal;
    }

    monthlyContributionNeeded =
      Math.round(monthlyContributionNeeded * 100) / 100;

    return {
      targetAmount,
      monthlyContribution: monthlyContributionNeeded,
      monthsToGoal,
      totalContributed:
        Math.round(monthlyContributionNeeded * monthsToGoal * 100) / 100,
      totalInterest: 0,
      finalAmount: targetAmount,
    };
  }

  return {
    targetAmount,
    monthlyContribution: 0,
    monthsToGoal: 0,
    totalContributed: 0,
    totalInterest: 0,
    finalAmount: 0,
  };
}
