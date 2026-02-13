// Ghana tax helpers (SSNIT + PAYE) used for budgeting net income estimates.

export type GhanaTaxBreakdown = {
  ssnit: number;
  paye: number;
  netTakeHome: number;
};

export function computeGhanaTax2026Monthly(grossMonthly: number): GhanaTaxBreakdown {
  const salaryAmount = Number.isFinite(grossMonthly) ? grossMonthly : 0;
  const gross = Math.max(0, salaryAmount);

  // SSNIT capped at GHS 69,000 insurable earnings (per your existing logic)
  const ssnitCap = 69000;
  const ssnit = Math.min(gross * 0.055, ssnitCap * 0.055);

  // PAYE taxable is after SSNIT
  const payeTaxable = gross - ssnit;
  let paye = 0;

  // 2026 PAYE brackets (7-tier graduated) - mirrored from dashboard implementation.
  if (payeTaxable > 490) {
    if (payeTaxable <= 1800) {
      paye = (payeTaxable - 490) * 0.055;
    } else if (payeTaxable <= 4350) {
      paye = (1800 - 490) * 0.055 + (payeTaxable - 1800) * 0.075;
    } else if (payeTaxable <= 6900) {
      paye =
        (1800 - 490) * 0.055 +
        (4350 - 1800) * 0.075 +
        (payeTaxable - 4350) * 0.095;
    } else if (payeTaxable <= 13800) {
      paye =
        (1800 - 490) * 0.055 +
        (4350 - 1800) * 0.075 +
        (6900 - 4350) * 0.095 +
        (payeTaxable - 6900) * 0.105;
    } else if (payeTaxable <= 20700) {
      paye =
        (1800 - 490) * 0.055 +
        (4350 - 1800) * 0.075 +
        (6900 - 4350) * 0.095 +
        (13800 - 6900) * 0.105 +
        (payeTaxable - 13800) * 0.115;
    } else if (payeTaxable <= 27600) {
      paye =
        (1800 - 490) * 0.055 +
        (4350 - 1800) * 0.075 +
        (6900 - 4350) * 0.095 +
        (13800 - 6900) * 0.105 +
        (20700 - 13800) * 0.115 +
        (payeTaxable - 20700) * 0.125;
    } else {
      paye =
        (1800 - 490) * 0.055 +
        (4350 - 1800) * 0.075 +
        (6900 - 4350) * 0.095 +
        (13800 - 6900) * 0.105 +
        (20700 - 13800) * 0.115 +
        (27600 - 20700) * 0.125 +
        (payeTaxable - 27600) * 0.135;
    }
  }

  const netTakeHome = Math.max(0, gross - ssnit - paye);
  return { ssnit, paye, netTakeHome };
}

