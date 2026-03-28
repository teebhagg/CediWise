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
  cancelAtPeriodEnd?: boolean
): TierInfo {
  const now = new Date();
  const trialExpiry = parseDate(trialEndsAt);
  const isOnTrial = trialExpiry !== null && trialExpiry > now;

  // EFFECTIVE TIER: SME takes absolute priority if on trial.
  // Otherwise, use the stored tier.
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
  };
}

/**
 * First 100 users get 60 days. Everyone else gets 30 days.
 */
export function getTrialDays(isEarlyBird: boolean): number {
  return isEarlyBird ? 60 : 30;
}
