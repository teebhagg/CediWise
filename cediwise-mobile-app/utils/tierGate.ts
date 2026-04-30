/**
 * Tier gating helpers.
 * Determines what features a user can access based on their tier + trial status.
 */

export type UserTier = "free" | "budget" | "sme";

export interface TierInfo {
  tier: UserTier;
  effectiveTier: UserTier; // tier after considering trial
  isOnTrial: boolean;
  trialEndsAt: string | null;
  canAccessBudget: boolean;
  canAccessSME: boolean;
  pendingTier: UserTier | null;
  pendingTierStartDate: string | null;
  cancelAtPeriodEnd: boolean;
  /** Raw DB status (e.g. grace_period, pending_payment) */
  subscriptionStatus: string | null;
  isInGracePeriod: boolean;
  gracePeriodEnd: string | null;
  /** Paid renewal cadence from DB (subscriptions.billing_cycle). */
  billingCycle?: "monthly" | "quarterly" | null;
  /** Deferred cadence switch (subscriptions.pending_billing_cycle). */
  pendingBillingCycle?: "monthly" | "quarterly" | null;
}

/**
 * Universal date parser for mobile (React Native/Hermes).
 * Postgres date strings use ' ' between day/time; Hermes requires 'T'.
 */
const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const sanitized = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(sanitized);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Compute effective tier considering trial status.
 * During trial, user gets full SME access regardless of stored tier.
 */
export function getTierInfo(
  tier: UserTier,
  trialEndsAt: string | null,
  pendingTier?: UserTier | null,
  pendingTierStartDate?: string | null,
  cancelAtPeriodEnd?: boolean,
  subscriptionStatus?: string | null,
  gracePeriodEnd?: string | null
): TierInfo {
  const now = new Date();
  const trialExpiry = parseDate(trialEndsAt);
  const isOnTrial = trialExpiry !== null && trialExpiry > now;
  const status = subscriptionStatus ?? null;
  const inGrace = status === "grace_period";

  // EFFECTIVE TIER: SME takes absolute priority if on trial.
  // Otherwise, use the stored tier (including grace_period — plan stays paid until janitor).
  const effectiveTier: UserTier = isOnTrial ? "sme" : tier;

  return {
    tier,
    effectiveTier,
    isOnTrial,
    trialEndsAt,
    canAccessBudget: effectiveTier !== "free",
    canAccessSME: effectiveTier === "sme",
    pendingTier: pendingTier ?? null,
    pendingTierStartDate: pendingTierStartDate ?? null,
    cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    subscriptionStatus: status,
    isInGracePeriod: inGrace,
    gracePeriodEnd: gracePeriodEnd ?? null,
  };
}

/**
 * First 100 users get 60 days. Everyone else gets 30 days.
 */
export function getTrialDays(isEarlyBird: boolean): number {
  return isEarlyBird ? 60 : 30;
}
