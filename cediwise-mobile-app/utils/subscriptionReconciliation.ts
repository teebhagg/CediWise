/**
 * After Paystack reports success, wait until `subscriptions` reflects the purchase
 * (webhook or client optimistic write). Uses Realtime + polling fallback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/utils/logger";

export type SubscriptionReconcileRow = {
  plan: string | null;
  status: string | null;
  pending_tier: string | null;
  billing_cycle: string | null;
  pending_billing_cycle: string | null;
};

export type ReconcilePaymentOptions = {
  /** @deprecated not used; both active+plan and trial+pending are always checked */
  isOnTrial?: boolean;
  targetTier: "budget" | "sme";
  /**
   * When `billing-upgrade-quote` returned `pending_billing_cycle_after` (proration + deferred
   * cadence), pass it so we keep waiting until `subscriptions.pending_billing_cycle` matches.
   */
  expectedPendingBillingCycleAfter?: "monthly" | "quarterly";
  /** Default 120s */
  timeoutMs?: number;
  /** Default 2500ms */
  pollIntervalMs?: number;
};

function normalizedPendingCadence(
  v: string | null | undefined
): "monthly" | "quarterly" | null {
  if (v === "monthly" || v === "quarterly") return v;
  return null;
}

export function subscriptionReflectsPayment(
  row: SubscriptionReconcileRow | null,
  opts: Pick<ReconcilePaymentOptions, "targetTier" | "expectedPendingBillingCycleAfter">
): boolean {
  if (!row) return false;
  const tierOk =
    (row.status === "active" && row.plan === opts.targetTier) ||
    (row.status === "trial" && row.pending_tier === opts.targetTier);
  if (!tierOk) return false;
  const expected = opts.expectedPendingBillingCycleAfter;
  if (expected === undefined) return true;
  return normalizedPendingCadence(row.pending_billing_cycle) === expected;
}

async function fetchSubscriptionRow(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionReconcileRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,pending_tier,billing_cycle,pending_billing_cycle")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    log.warn("[subscriptionReconciliation] fetch row:", error.message);
    return null;
  }
  return data as SubscriptionReconcileRow | null;
}

/**
 * Resolves when the row matches the paid state, or after timeout (poll + realtime).
 */
export function waitForSubscriptionReconciliation(
  supabase: SupabaseClient,
  userId: string,
  opts: ReconcilePaymentOptions
): Promise<{ ok: boolean; timedOut: boolean; row: SubscriptionReconcileRow | null }> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 2500;

  return new Promise((resolve) => {
    let settled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    /** Assigned after initial fetch if sync continues; timeout covers stalled fetch before this exists. */
    let channel: ReturnType<SupabaseClient["channel"]> | undefined;

    const cleanup = (ch: typeof channel) => {
      if (pollId !== undefined) clearInterval(pollId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (ch !== undefined) void supabase.removeChannel(ch);
    };

    const finish = (
      ch: typeof channel,
      ok: boolean,
      timedOut: boolean,
      row: SubscriptionReconcileRow | null
    ) => {
      if (settled) return;
      settled = true;
      cleanup(ch);
      resolve({ ok, timedOut, row });
    };

    const tryResolve = async (
      ch: ReturnType<SupabaseClient["channel"]>,
      from: string
    ) => {
      if (settled) return;
      const row = await fetchSubscriptionRow(supabase, userId);
      if (subscriptionReflectsPayment(row, opts)) {
        log.info(`[subscriptionReconciliation] satisfied (${from})`);
        finish(ch, true, false, row);
      }
    };

    timeoutId = setTimeout(() => {
      void (async () => {
        if (settled) return;
        const row = await fetchSubscriptionRow(supabase, userId);
        if (settled) return;
        const ok = subscriptionReflectsPayment(row, opts);
        finish(channel, ok, true, row);
      })();
    }, timeoutMs);

    void (async () => {
      const row0 = await fetchSubscriptionRow(supabase, userId);
      if (settled) return;
      if (subscriptionReflectsPayment(row0, opts)) {
        finish(channel, true, false, row0);
        return;
      }

      channel = supabase
        .channel(`billing-sub:${userId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void tryResolve(channel!, "realtime");
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            log.warn("[subscriptionReconciliation] realtime CHANNEL_ERROR; polling only");
          }
        });

      pollId = setInterval(() => {
        void tryResolve(channel!, "poll");
      }, pollIntervalMs);
    })();
  });
}
