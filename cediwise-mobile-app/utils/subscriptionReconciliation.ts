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
};

export type ReconcilePaymentOptions = {
  /** @deprecated not used; both active+plan and trial+pending are always checked */
  isOnTrial?: boolean;
  targetTier: "budget" | "sme";
  /** Default 120s */
  timeoutMs?: number;
  /** Default 2500ms */
  pollIntervalMs?: number;
};

export function subscriptionReflectsPayment(
  row: SubscriptionReconcileRow | null,
  opts: Pick<ReconcilePaymentOptions, "targetTier">
): boolean {
  if (!row) return false;
  if (row.status === "active" && row.plan === opts.targetTier) return true;
  if (row.status === "trial" && row.pending_tier === opts.targetTier) return true;
  return false;
}

async function fetchSubscriptionRow(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionReconcileRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,pending_tier")
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

    const cleanup = (channel: ReturnType<SupabaseClient["channel"]>) => {
      if (pollId !== undefined) clearInterval(pollId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      void supabase.removeChannel(channel);
    };

    const finish = (
      channel: ReturnType<SupabaseClient["channel"]>,
      ok: boolean,
      timedOut: boolean,
      row: SubscriptionReconcileRow | null
    ) => {
      if (settled) return;
      settled = true;
      cleanup(channel);
      resolve({ ok, timedOut, row });
    };

    const tryResolve = async (
      channel: ReturnType<SupabaseClient["channel"]>,
      from: string
    ) => {
      if (settled) return;
      const row = await fetchSubscriptionRow(supabase, userId);
      if (subscriptionReflectsPayment(row, opts)) {
        log.info(`[subscriptionReconciliation] satisfied (${from})`);
        finish(channel, true, false, row);
      }
    };

    void (async () => {
      const row0 = await fetchSubscriptionRow(supabase, userId);
      if (subscriptionReflectsPayment(row0, opts)) {
        resolve({ ok: true, timedOut: false, row: row0 });
        return;
      }

      const channel = supabase
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
            void tryResolve(channel, "realtime");
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            log.warn("[subscriptionReconciliation] realtime CHANNEL_ERROR; polling only");
          }
        });

      pollId = setInterval(() => {
        void tryResolve(channel, "poll");
      }, pollIntervalMs);

      timeoutId = setTimeout(() => {
        void (async () => {
          const row = await fetchSubscriptionRow(supabase, userId);
          const ok = subscriptionReflectsPayment(row, opts);
          finish(channel, ok, true, row);
        })();
      }, timeoutMs);
    })();
  });
}
