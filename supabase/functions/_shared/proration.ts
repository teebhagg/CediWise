/**
 * Prorated tier upgrade (budget → SME) for the remainder of the current period.
 * Top-up is rounded **up to the nearest whole GHS** (no decimal cedis in the charge).
 * Prices must match PLAN_MOMO_CHARGE / PLAN_CARD_INIT in plans.ts.
 */

import { PLAN_MOMO_CHARGE } from "./plans.ts";

export type BillingCadence = "monthly" | "quarterly";

export const MIN_PRORATION_PESOWAS = 100;

const PLAN_KEYS: Record<
  "budget" | "sme",
  Record<BillingCadence, string>
> = {
  budget: { monthly: "budget_monthly", quarterly: "budget_quarterly" },
  sme: { monthly: "sme_monthly", quarterly: "sme_quarterly" },
};

export function planKeyToCadence(planKey: string): BillingCadence {
  return planKey.includes("quarterly") ? "quarterly" : "monthly";
}

export function pricePesewasForTierAndCadence(
  tier: "budget" | "sme",
  cadence: BillingCadence
): number {
  const key = PLAN_KEYS[tier][cadence];
  return PLAN_MOMO_CHARGE[key].amount_pesewas;
}

export function tierRank(tier: string): number {
  if (tier === "sme") return 2;
  if (tier === "budget") return 1;
  return 0;
}

export type ProrationInput = {
  fromTier: "budget" | "sme";
  toTier: "budget" | "sme";
  /** Active subscription invoice cadence (length of current_period_*). */
  periodCadence: BillingCadence;
  /** Plan cadence the user is upgrading into (e.g. sme_quarterly). */
  toCadence: BillingCadence;
  periodStartIso: string;
  periodEndIso: string;
  now: Date;
};

/**
 * List price for a tier on `tierCadence`, expressed as the cost for one subscription
 * invoice of type `periodCadence` (to compare apples with the current period length).
 * e.g. quarterly SME in a monthly period → one-third of quarterly; monthly SME in a quarterly period → 3× monthly.
 */
export function priceInPeriodForTierCadence(
  tier: "budget" | "sme",
  tierCadence: BillingCadence,
  periodCadence: BillingCadence
): number {
  if (tierCadence === periodCadence) {
    return pricePesewasForTierAndCadence(tier, tierCadence);
  }
  const m = pricePesewasForTierAndCadence(tier, "monthly");
  const q = pricePesewasForTierAndCadence(tier, "quarterly");
  if (periodCadence === "monthly" && tierCadence === "quarterly") {
    return Math.ceil(q / 3);
  }
  if (periodCadence === "quarterly" && tierCadence === "monthly") {
    return 3 * m;
  }
  return pricePesewasForTierAndCadence(tier, tierCadence);
}

export type ProrationResult = {
  amountPesewas: number;
  deltaFullPeriodPesewas: number;
  ratio: number;
};

/**
 * Returns null if not an upgrade or ineligible period.
 */
export function computeProratedTierUpgrade(
  input: ProrationInput
): ProrationResult | null {
  const { fromTier, toTier, periodCadence, toCadence, periodStartIso, periodEndIso, now } =
    input;

  if (tierRank(toTier) <= tierRank(fromTier)) return null;

  const start = new Date(periodStartIso);
  const end = new Date(periodEndIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end <= start) return null;

  const fromPrice = pricePesewasForTierAndCadence(fromTier, periodCadence);
  /**
   * Budget (monthly) → SME (quarterly): match the in-app headline gap (GHS 65 − GHS 15 = 50)
   * for a full month left in the period. Do **not** use the per-month share of the quarterly
   * list price (which would be ~GHS 22 and imply a ~GHS 7 top-up and confuse users).
   */
  const toPrice =
    fromTier === "budget" &&
    toTier === "sme" &&
    periodCadence === "monthly" &&
    toCadence === "quarterly"
      ? pricePesewasForTierAndCadence("sme", "quarterly")
      : priceInPeriodForTierCadence(toTier, toCadence, periodCadence);
  const delta = toPrice - fromPrice;
  if (delta <= 0) return null;

  const totalMs = end.getTime() - start.getTime();
  const remainingMs = end.getTime() - now.getTime();
  if (remainingMs <= 0) return null;
  if (totalMs <= 0) return null;

  /** Integer proration (avoids float drift) + snap when ≥99% of period remains (GHS 49 vs 50). */
  const deltaBi = BigInt(Math.floor(delta));
  const remBi = BigInt(Math.floor(remainingMs));
  const totBi = BigInt(Math.floor(totalMs));
  let prorPes = (deltaBi * remBi) / totBi;
  /** ≥98% of the period: charge the full in-period delta (4999+ ok; 4900/5000 needs this). */
  if (prorPes * 100n >= deltaBi * 98n) {
    prorPes = deltaBi;
  }
  const ratio = Number(remainingMs) / Number(totalMs);
  const raw = Number(prorPes);

  /** Nearest whole GHS upward (100 pesewas). */
  let amountPesewas = Math.ceil(raw / 100) * 100;
  if (amountPesewas === 0 && raw > 0) {
    amountPesewas = MIN_PRORATION_PESOWAS;
  }

  return {
    amountPesewas,
    deltaFullPeriodPesewas: delta,
    ratio,
  };
}

export function pesewasToGhsMajor(amountPesewas: number): number {
  return Math.round(amountPesewas) / 100;
}

/** Paystack / mobile SDK amount in whole GHS (proration uses integer cedis only). */
export function pesewasToCheckoutGhs(amountPesewas: number): number {
  return Math.round(amountPesewas / 100);
}
