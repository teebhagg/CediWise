import { GHANA_TAX_FALLBACK_2026, type TaxConfig } from "./taxSync";

// Ghana tax helpers (SSNIT + PAYE) used for budgeting net income estimates.

export type GhanaTaxBreakdown = {
  ssnit: number;
  nhis: number;
  paye: number;
  netTakeHome: number;
};

/**
 * Calculates Ghana tax (PAYE + SSNIT) using dynamic config.
 * @param grossMonthly Gross monthly salary
 * @param config Optional dynamic config (falls back to static 2026 rates)
 */
export function computeGhanaTax2026Monthly(
  grossMonthly: number,
  config: TaxConfig = GHANA_TAX_FALLBACK_2026
): GhanaTaxBreakdown {
  const salaryAmount = Number.isFinite(grossMonthly) ? grossMonthly : 0;
  const gross = Math.max(0, salaryAmount);

  // SSNIT capped at GHS 69,000 insurable earnings
  const insurableEarnings = Math.min(gross, config.ssnit_monthly_cap);
  const ssnit = insurableEarnings * config.employee_ssnit_rate;

  // NHIS (employer-funded, informational) — same cap as SSNIT
  const nhis = insurableEarnings * config.nhis_rate;

  // PAYE taxable is after SSNIT
  const payeTaxable = gross - ssnit;
  let paye = 0;

  // Progressive PAYE calculation
  let remaining = payeTaxable;
  for (const bracket of config.paye_brackets) {
    if (remaining <= 0) break;

    const limit = bracket.band_width ?? remaining;
    const taxable = Math.min(remaining, limit);

    paye += taxable * bracket.rate;
    remaining -= taxable;
  }

  const netTakeHome = Math.max(0, gross - ssnit - paye);
  return { ssnit, nhis, paye, netTakeHome };
}

