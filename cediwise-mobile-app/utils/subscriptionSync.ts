/**
 * Wait for subscriptions row to reflect Paystack webhook after payment.
 * Uses Realtime + polling (Hermes / backgrounding fallbacks).
 *
 * Server amounts & keys: ../../supabase/functions/_shared/plans.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  subscriptionReflectsPayment,
  type SubscriptionReconcileRow,
} from "@/utils/subscriptionReconciliation";

export type SubscriptionRow = SubscriptionReconcileRow & {
  trial_ends_at: string | null;
  updated_at: string | null;
};

/**
 * Returns true when the row reflects a successful post-payment state for the paid tier.
 * - Immediate activation / proration: `active` and `plan` matches.
 * - Trial stacking (pay now, entitlements at trial end): `trial` and `pending_tier` matches.
 * Both are checked: client `isOnTrial` is not authoritative (stale) and the webhook can
 * activate immediately even when the pre-pay UI still showed trial.
 * When `expectedPendingBillingCycleAfter` is set (from quote `pending_billing_cycle_after`),
 * `pending_billing_cycle` must match before resolving.
 */
export function subscriptionMatchesPayment(
  row: SubscriptionRow | null,
  targetTier: "budget" | "sme",
  options?: { expectedPendingBillingCycleAfter?: "monthly" | "quarterly" }
): boolean {
  return subscriptionReflectsPayment(row, {
    targetTier,
    expectedPendingBillingCycleAfter: options?.expectedPendingBillingCycleAfter,
  });
}

export async function waitForSubscriptionAfterPayment(
  supabase: SupabaseClient,
  userId: string,
  targetTier: "budget" | "sme",
  options?: {
    timeoutMs?: number;
    onTick?: () => void;
    expectedPendingBillingCycleAfter?: "monthly" | "quarterly";
  }
): Promise<{ ok: boolean; row: SubscriptionRow | null }> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;

  const fetchRow = async (): Promise<SubscriptionRow | null> => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "plan, status, pending_tier, billing_cycle, pending_billing_cycle, trial_ends_at, updated_at"
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  };

  const matches = (row: SubscriptionRow | null) =>
    subscriptionMatchesPayment(row, targetTier, {
      expectedPendingBillingCycleAfter: options?.expectedPendingBillingCycleAfter,
    });

  const initial = await fetchRow();
  if (matches(initial)) {
    return { ok: true, row: initial };
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    let pollCount = 0;
    /** Tighten polling right after payment so a fast webhook is noticed within ~0.5s. */
    const FAST_MS = 500;
    const STEADY_MS = 2000;
    const FAST_POLLS = 20;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    let channel: ReturnType<SupabaseClient["channel"]>;

    const finishWithError = (err: unknown) => {
      if (finished) return;
      finished = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      void supabase.removeChannel(channel);
      reject(err);
    };

    const finish = (ok: boolean, row: SubscriptionRow | null) => {
      if (finished) return;
      finished = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      void supabase.removeChannel(channel);
      resolve({ ok, row });
    };

    channel = supabase
      .channel(`billing-sync-${userId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          try {
            const row = await fetchRow();
            if (matches(row)) finish(true, row);
          } catch (e) {
            finishWithError(e);
          }
        }
      )
      .subscribe();

    const runPoll = async () => {
      if (finished) return;
      try {
        options?.onTick?.();
        if (Date.now() >= deadline) {
          const row = await fetchRow();
          finish(false, row);
          return;
        }
        const row = await fetchRow();
        if (matches(row)) {
          finish(true, row);
          return;
        }
        pollCount += 1;
        const nextMs = pollCount < FAST_POLLS ? FAST_MS : STEADY_MS;
        timeoutId = setTimeout(() => {
          void runPoll();
        }, nextMs);
      } catch (e) {
        finishWithError(e);
      }
    };

    void runPoll();
  });
}
