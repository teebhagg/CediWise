/**
 * PAYE & SSNIT Calculator
 * Based on GRA 2025 tax bands. For educational purposes only.
 * Supports manual rate override.
 */

export type PayeBand = {
  min: number;
  max: number;
  rate: number;
};

/** Default 2025 GRA PAYE bands (monthly, GHS). SSNIT deducted before PAYE. */
export const DEFAULT_PAYE_BANDS_2025: PayeBand[] = [
  { min: 0, max: 490, rate: 0 },
  { min: 490, max: 600, rate: 0.05 },
  { min: 600, max: 730, rate: 0.1 },
  { min: 730, max: 3896.67, rate: 0.175 },
  { min: 3896.67, max: 19896.67, rate: 0.25 },
  { min: 19896.67, max: 50416.67, rate: 0.3 },
  { min: 50416.67, max: Infinity, rate: 0.35 },
];

export type PayeSsnitInput = {
  /** Monthly gross salary (GHS) */
  grossSalary: number;
  /** SSNIT rate (default 5.5%). Set to 0 to exclude. */
  ssnitRate?: number;
  /** Override PAYE bands. If not provided, uses DEFAULT_PAYE_BANDS_2025. */
  payeBands?: PayeBand[];
};

export type PayeSsnitResult = {
  grossSalary: number;
  ssnitAmount: number;
  ssnitRate: number;
  chargeableIncome: number;
  payeAmount: number;
  netSalary: number;
  totalDeductions: number;
};

const DEFAULT_SSNIT_RATE = 0.055;

export function calculatePayeSsnit(input: PayeSsnitInput): PayeSsnitResult {
  const { grossSalary } = input;
  const ssnitRate = input.ssnitRate ?? DEFAULT_SSNIT_RATE;
  const bands = input.payeBands ?? DEFAULT_PAYE_BANDS_2025;

  const ssnitAmount = Math.round(grossSalary * ssnitRate * 100) / 100;
  const chargeableIncome = Math.max(0, grossSalary - ssnitAmount);

  let payeAmount = 0;
  let remaining = chargeableIncome;

  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.max - band.min;
    const taxableInBand = Math.min(remaining, bandWidth);
    payeAmount += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  payeAmount = Math.round(payeAmount * 100) / 100;
  const totalDeductions = ssnitAmount + payeAmount;
  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

  return {
    grossSalary,
    ssnitAmount,
    ssnitRate,
    chargeableIncome,
    payeAmount,
    netSalary,
    totalDeductions,
  };
}
