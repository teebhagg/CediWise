import type { TaxConfig } from "./taxSync";

/** GRA rounding tolerance: ±GHS 1 treated as matching (FRD F-01). */
export const PAYE_VERIFICATION_TOLERANCE_GHS = 1;

export type EmployerDeductionVerdict = "correct" | "overpaid" | "underpaid";

export type EmployerDeductionCompare = {
  verdict: EmployerDeductionVerdict;
  /** claimed − computed (positive ⇒ employer took more than GRA figure). */
  diff: number;
  claimed: number;
  computed: number;
};

function sanitizeAmount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n;
}

/**
 * Compare employer-claimed deduction vs GRA-mandated amount from `computeGhanaTax2026Monthly`.
 */
export function compareEmployerDeduction(
  claimedRaw: number,
  computedRaw: number,
  toleranceGhs: number = PAYE_VERIFICATION_TOLERANCE_GHS,
): EmployerDeductionCompare {
  const claimed = Math.max(0, sanitizeAmount(claimedRaw));
  const computed = Math.max(0, sanitizeAmount(computedRaw));
  const diff = claimed - computed;
  if (Math.abs(diff) <= toleranceGhs) {
    return { verdict: "correct", diff, claimed, computed };
  }
  if (diff > toleranceGhs) {
    return { verdict: "overpaid", diff, claimed, computed };
  }
  return { verdict: "underpaid", diff, claimed, computed };
}

export type PayeVerificationSnapshot = {
  paye: EmployerDeductionCompare;
  ssnit: EmployerDeductionCompare;
  /** Monthly PAYE overshoot when employer deducted too much PAYE (else null). */
  annualPayeOverpaymentIfOverpaid: number | null;
};

export function buildPayeVerificationSnapshot(
  employerPaye: number,
  employerSsnit: number,
  computedPaye: number,
  computedSsnit: number,
  toleranceGhs: number = PAYE_VERIFICATION_TOLERANCE_GHS,
): PayeVerificationSnapshot {
  const paye = compareEmployerDeduction(employerPaye, computedPaye, toleranceGhs);
  const ssnit = compareEmployerDeduction(employerSsnit, computedSsnit, toleranceGhs);
  const annualPayeOverpaymentIfOverpaid =
    paye.verdict === "overpaid" ? paye.diff * 12 : null;
  return { paye, ssnit, annualPayeOverpaymentIfOverpaid };
}

/**
 * Single analytics-friendly state (no PII). Multiple mismatches ⇒ `mixed`.
 */
export function payeVerificationResultState(
  snap: PayeVerificationSnapshot,
): string {
  const { paye, ssnit } = snap;
  if (paye.verdict === "correct" && ssnit.verdict === "correct") {
    return "correct";
  }
  const flags: string[] = [];
  if (paye.verdict !== "correct") {
    flags.push(`paye_${paye.verdict}`);
  }
  if (ssnit.verdict !== "correct") {
    flags.push(`ssnit_${ssnit.verdict}`);
  }
  if (flags.length === 1) {
    return flags[0]!;
  }
  return "mixed";
}

/** Bucket gross salary for analytics (no exact amounts). */
export function salaryRangeBucket(grossMonthly: number): string {
  const g = sanitizeAmount(grossMonthly);
  if (g <= 0) return "unknown";
  if (g < 1_000) return "0_999";
  if (g < 5_000) return "1000_4999";
  if (g < 10_000) return "5000_9999";
  if (g < 50_000) return "10000_49999";
  if (g < 500_000) return "50000_499999";
  return "500000_plus";
}

export function isSsnitInsurableCapApplied(
  grossMonthly: number,
  config: TaxConfig,
): boolean {
  const g = sanitizeAmount(grossMonthly);
  const cap = sanitizeAmount(config.ssnit_monthly_cap);
  if (cap <= 0) return false;
  return g > cap;
}

export const HIGH_SALARY_WARNING_THRESHOLD_GHS = 500_000;

export function shouldShowHighSalaryWarning(grossMonthly: number): boolean {
  return sanitizeAmount(grossMonthly) > HIGH_SALARY_WARNING_THRESHOLD_GHS;
}

/**
 * Playful, casual copy for the shareable card — no salary, no cedi amounts.
 * PAYE gets the headline treatment; SSNIT is the secondary line.
 */
export function describeCasualPayeLine(
  verdict: EmployerDeductionVerdict,
): string {
  switch (verdict) {
    case "correct":
      return "Your employer's deductions are on point! ✅";
    case "overpaid":
      return "Heads up! Your employer deducted more than GRA requires this year 💸";
    case "underpaid":
      return "We spotted something — your employer's deducting less than GRA requires ⚠️";
  }
}

export function describeCasualSsnitLine(
  verdict: EmployerDeductionVerdict,
): string {
  switch (verdict) {
    case "correct":
      return "SSNIT looks good too! ✓";
    case "overpaid":
      return "SSNIT's also on the high side — worth checking with your payroll 👀";
    case "underpaid":
      return "SSNIT's coming up short too — flag this with your employer 🚩";
  }
}

/** Dynamic casual share message based on the overall verdict. */
export function buildCasualShareMessage(
  snap: PayeVerificationSnapshot,
): string {
  const state = payeVerificationResultState(snap);
  if (state === "correct") {
    return "Just checked my PAYE with CediWise. All good on my end ✅ Check yours: cediwise.app";
  }
  if (state.includes("overpaid")) {
    return "Just checked my PAYE with CediWise. Turns out my employer's been overdeducting 😤 Check yours: cediwise.app";
  }
  if (state.includes("underpaid")) {
    return "Just checked my PAYE with CediWise. Found some discrepancies with my deductions 🤔 Check yours: cediwise.app";
  }
  // mixed verdict
  return "Just checked my PAYE with CediWise. Found some things that don't add up 🤨 Check yours: cediwise.app";
}

/**
 * Human-readable, privacy-safe copy for sharing: no salary, no cedi amounts.
 * Describes whether employer-claimed figures match, are higher, or lower than
 * CediWise's GRA-based calculation.
 */
export function describePrivacySafeDeductionLine(
  label: "PAYE" | "SSNIT",
  verdict: EmployerDeductionVerdict,
): string {
  switch (verdict) {
    case "correct":
      return `${label}: Matches what CediWise calculated for GRA rates.`;
    case "overpaid":
      return `${label}: Employer deducted more than CediWise calculated.`;
    case "underpaid":
      return `${label}: Employer deducted less than CediWise calculated.`;
  }
}

/** Multi-line body for system share sheet — safe to forward (no PII). */
export function buildPrivacySafeShareBody(snap: PayeVerificationSnapshot): string {
  const paye = describePrivacySafeDeductionLine("PAYE", snap.paye.verdict);
  const ssnit = describePrivacySafeDeductionLine("SSNIT", snap.ssnit.verdict);
  return `${paye}\n${ssnit}`;
}
