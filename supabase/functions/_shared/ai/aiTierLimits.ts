export type PlanTier = "free" | "budget" | "sme";

/** Chat turns per calendar day by effective tier (spec). */
export function chatLimitForTier(tier: PlanTier): number {
  switch (tier) {
    case "free":
      return 5;
    case "budget":
      return 20;
    case "sme":
      return 50;
    default:
      return 5;
  }
}

/**
 * Mirrors mobile `getTierInfo` effective tier during trial → SME for limits.
 */
export function effectiveTierFromSubscription(
  plan: string | null,
  trialEndsAt: string | null,
): PlanTier {
  const p = (plan ?? "free") as PlanTier;
  if (
    trialEndsAt &&
    !Number.isNaN(new Date(trialEndsAt).getTime()) &&
    new Date(trialEndsAt) > new Date()
  ) {
    return "sme";
  }
  if (p === "budget" || p === "sme" || p === "free") return p;
  return "free";
}
