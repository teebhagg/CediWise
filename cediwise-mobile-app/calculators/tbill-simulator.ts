/**
 * T-Bill Projection Simulator
 * Projects returns for Ghana Treasury Bills. For educational purposes only.
 * Supports manual rate override when live data unavailable.
 */

export type TbillSimulatorInput = {
  principal: number;
  /** Annual interest rate (0-1). Override when live data stale. */
  annualRate: number;
  /** Tenor in days: 91, 182, or 364 */
  tenorDays: number;
};

export type TbillSimulatorResult = {
  principal: number;
  interestEarned: number;
  maturityAmount: number;
  tenorDays: number;
  annualRate: number;
};

export function calculateTbillProjection(
  input: TbillSimulatorInput
): TbillSimulatorResult {
  const { principal, annualRate, tenorDays } = input;

  if (principal <= 0) {
    return {
      principal: 0,
      interestEarned: 0,
      maturityAmount: 0,
      tenorDays,
      annualRate,
    };
  }

  const fractionOfYear = tenorDays / 365;
  const interestEarned =
    Math.round(principal * annualRate * fractionOfYear * 100) / 100;
  const maturityAmount = Math.round((principal + interestEarned) * 100) / 100;

  return {
    principal,
    interestEarned,
    maturityAmount,
    tenorDays,
    annualRate,
  };
}
