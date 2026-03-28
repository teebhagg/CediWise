/**
 * VAT Calculation Engine
 * Ghana Act 1151 — effective 1 January 2026
 * 20% unified rate (15% VAT + 2.5% NHIL + 2.5% GETFund)
 */

import type { BusinessType, SMETotals, SMETransaction, ThresholdStatus, ThresholdInfo } from "../types/sme";

export const VAT_RATE = 0.2;
export const VAT_THRESHOLD_GHS = 750_000;

/**
 * Calculate VAT amount from a gross (VAT-inclusive) amount.
 * Formula: vat = gross - (gross / (1 + rate))
 * For 20% VAT: vat = gross - (gross / 1.2)
 */
export function calculateVAT(amount: number, applicable: boolean): number {
  if (!applicable || amount <= 0) return 0;
  const net = amount / (1 + VAT_RATE);
  return Math.round((amount - net) * 100) / 100;
}

/**
 * Extract VAT and net from a VAT-inclusive gross amount.
 * The user enters a total (e.g. GHS 120), we extract:
 *   net = 120 / 1.2 = 100
 *   vat = 120 - 100 = 20
 */
export function extractVAT(grossAmount: number): { vat: number; net: number } {
  const net = Math.round((grossAmount / (1 + VAT_RATE)) * 100) / 100;
  const vat = Math.round((grossAmount - net) * 100) / 100;
  return { vat, net };
}

/**
 * Get VAT threshold status.
 * Goods: GHS 750,000 annual turnover threshold.
 * Services/Mixed: No threshold — all service providers must register.
 */
export function getThresholdInfo(
  annualTurnover: number,
  businessType: BusinessType
): ThresholdInfo {
  if (businessType === "services" || businessType === "mixed") {
    return {
      status: "services_no_threshold",
      annualTurnover,
      threshold: VAT_THRESHOLD_GHS,
      percentage: 0,
      message:
        "All service providers must register for VAT regardless of turnover. There is no threshold exemption for services under Act 1151.",
    };
  }

  // Goods
  if (annualTurnover <= 0) {
    return {
      status: "ok",
      annualTurnover: 0,
      threshold: VAT_THRESHOLD_GHS,
      percentage: 0,
      message: "Add your first sale to start tracking your VAT threshold.",
    };
  }

  const percentage = Math.min(
    100,
    Math.round((annualTurnover / VAT_THRESHOLD_GHS) * 100)
  );

  if (annualTurnover >= VAT_THRESHOLD_GHS) {
    return {
      status: "over_threshold",
      annualTurnover,
      threshold: VAT_THRESHOLD_GHS,
      percentage: 100,
      message:
        "You have exceeded the GHS 750,000 threshold. You must register for VAT with GRA.",
    };
  }
  if (percentage >= 80) {
    return {
      status: "approaching_80",
      annualTurnover,
      threshold: VAT_THRESHOLD_GHS,
      percentage,
      message: `You are at ${percentage}% of the GHS 750,000 threshold. Consider registering for VAT soon.`,
    };
  }
  if (percentage >= 60) {
    return {
      status: "warning_60",
      annualTurnover,
      threshold: VAT_THRESHOLD_GHS,
      percentage,
      message: `You are at ${percentage}% of the threshold. Start preparing for VAT registration.`,
    };
  }
  return {
    status: "ok",
    annualTurnover,
    threshold: VAT_THRESHOLD_GHS,
    percentage,
    message: "You are below the VAT registration threshold for goods.",
  };
}

/** Compute aggregate totals from a list of SME transactions. */
export function computeTotals(transactions: SMETransaction[]): SMETotals {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let vatCollected = 0;
  let vatPaid = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalRevenue += tx.amount;
      vatCollected += tx.vatAmount;
    } else {
      totalExpenses += tx.amount;
      vatPaid += tx.vatAmount;
    }
  }

  return {
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses,
    vatCollected,
    vatPaid,
    vatPayable: Math.round((vatCollected - vatPaid) * 100) / 100,
  };
}

/** Get the last day of a given month (handles leap years). */
function lastDayOfMonth(year: number, month: number): number {
  // month is 1-based; Date uses 0-based months, so day=0 of next month = last day of current month
  return new Date(year, month, 0).getDate();
}

/** Compute fiscal year turnover (income only) from transactions. */
export function computeAnnualTurnover(
  transactions: SMETransaction[],
  fiscalYearStartMonth: number = 1
): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // Determine fiscal year start date
  let fiscalStartYear: number;
  if (currentMonth >= fiscalYearStartMonth) {
    fiscalStartYear = currentYear;
  } else {
    fiscalStartYear = currentYear - 1;
  }

  const fiscalStart = `${fiscalStartYear}-${String(fiscalYearStartMonth).padStart(2, "0")}-01`;
  const fiscalEndMonth = fiscalYearStartMonth === 1 ? 12 : fiscalYearStartMonth - 1;
  const fiscalEndYear = fiscalYearStartMonth === 1 ? fiscalStartYear : fiscalStartYear + 1;
  const endDay = lastDayOfMonth(fiscalEndYear, fiscalEndMonth);
  const fiscalEnd = `${fiscalEndYear}-${String(fiscalEndMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  let turnover = 0;
  for (const tx of transactions) {
    if (tx.type === "income" && tx.transactionDate >= fiscalStart && tx.transactionDate <= fiscalEnd) {
      turnover += tx.amount;
    }
  }
  return turnover;
}
