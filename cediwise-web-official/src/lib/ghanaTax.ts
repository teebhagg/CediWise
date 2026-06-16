export type PAYEBracket = {
  band_width: number | null
  rate: number
}

/** Official GRA page with monthly and annual PAYE income tax band tables. */
export const GRA_PAYE_REFERENCE_URL =
  'https://gra.gov.gh/domestic-tax/tax-types/paye/'

export type TaxConfig = {
  employee_ssnit_rate: number
  ssnit_monthly_cap: number
  nhis_rate: number
  paye_brackets: PAYEBracket[]
}

export const GHANA_TAX_FALLBACK_2026: TaxConfig = {
  employee_ssnit_rate: 0.055,
  ssnit_monthly_cap: 69000,
  nhis_rate: 0.025,
  paye_brackets: [
    { band_width: 490, rate: 0 },
    { band_width: 110, rate: 0.05 },
    { band_width: 130, rate: 0.1 },
    { band_width: 3166.67, rate: 0.175 },
    { band_width: 16000, rate: 0.25 },
    { band_width: 30520, rate: 0.3 },
    { band_width: null, rate: 0.35 },
  ],
}

export type GhanaTaxBreakdown = {
  grossMonthly: number
  ssnit: number
  nhis: number
  paye: number
  netTakeHome: number
  chargeableIncome: number
}

/** Maximum gross monthly salary accepted by the web calculator. */
export const MAX_GROSS_MONTHLY_SALARY = 500_000

/**
 * Calculates Ghana tax (PAYE + SSNIT) using the same logic as the mobile app.
 */
export function computeGhanaTax2026Monthly(
  grossMonthly: number,
  config: TaxConfig = GHANA_TAX_FALLBACK_2026,
): GhanaTaxBreakdown {
  const salaryAmount = Number.isFinite(grossMonthly) ? grossMonthly : 0
  const gross = Math.max(0, Math.min(salaryAmount, MAX_GROSS_MONTHLY_SALARY))

  const insurableEarnings = Math.min(gross, config.ssnit_monthly_cap)
  const ssnit = insurableEarnings * config.employee_ssnit_rate
  const nhis = insurableEarnings * config.nhis_rate

  const chargeableIncome = Math.max(0, gross - ssnit)
  let paye = 0
  let remaining = chargeableIncome

  for (const bracket of config.paye_brackets) {
    if (remaining <= 0) break

    const limit = bracket.band_width ?? remaining
    const taxable = Math.min(remaining, limit)

    paye += taxable * bracket.rate
    remaining -= taxable
  }

  const netTakeHome = Math.max(0, gross - round2(ssnit) - round2(paye))

  return {
    grossMonthly: gross,
    ssnit: round2(ssnit),
    nhis: round2(nhis),
    paye: round2(paye),
    netTakeHome: round2(netTakeHome),
    chargeableIncome: round2(chargeableIncome),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
