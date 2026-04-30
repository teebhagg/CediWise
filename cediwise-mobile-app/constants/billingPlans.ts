/**
 * Plan keys and display labels. Amounts (pesewas) live in
 * `supabase/functions/_shared/plans.ts` — keep pricing changes in sync there.
 */

export const PAID_PLAN_KEYS = [
  "budget_monthly",
  "budget_quarterly",
  "sme_monthly",
  "sme_quarterly",
] as const;

export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];
