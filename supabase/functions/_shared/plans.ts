/**
 * Single source of truth for Paystack plan keys, amounts (pesewas), and labels.
 * Imported by paystack-initiate, paystack-momo-charge, and (via copy) documented for mobile.
 */

export const PLAN_KEY_TO_TIER: Record<string, "budget" | "sme"> = {
  budget_monthly: "budget",
  budget_quarterly: "budget",
  sme_monthly: "sme",
  sme_quarterly: "sme",
};

/** Card: hosted init uses plan_code env + amount. */
export const PLAN_CARD_INIT: Record<
  string,
  { plan_code_env: string; amount_pesewas: number; label: string }
> = {
  budget_monthly: {
    plan_code_env: "PAYSTACK_PLAN_BUDGET_MONTHLY",
    amount_pesewas: 1500,
    label: "Smart Budget Monthly",
  },
  budget_quarterly: {
    plan_code_env: "PAYSTACK_PLAN_BUDGET_QUARTERLY",
    amount_pesewas: 3900,
    label: "Smart Budget Quarterly",
  },
  sme_monthly: {
    plan_code_env: "PAYSTACK_PLAN_SME_MONTHLY",
    amount_pesewas: 2500,
    label: "SME Ledger Monthly",
  },
  sme_quarterly: {
    plan_code_env: "PAYSTACK_PLAN_SME_QUARTERLY",
    amount_pesewas: 6500,
    label: "SME Ledger Quarterly",
  },
};

/** MoMo: direct /charge amount only (no Paystack plan object). */
export const PLAN_MOMO_CHARGE: Record<
  string,
  { amount_pesewas: number; label: string }
> = {
  budget_monthly: { amount_pesewas: 1500, label: "Smart Budget Monthly" },
  budget_quarterly: { amount_pesewas: 3900, label: "Smart Budget Quarterly" },
  sme_monthly: { amount_pesewas: 2500, label: "SME Ledger Monthly" },
  sme_quarterly: { amount_pesewas: 6500, label: "SME Ledger Quarterly" },
};
