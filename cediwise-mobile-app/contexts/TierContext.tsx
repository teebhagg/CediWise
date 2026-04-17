/**
 * TierContext
 * Provides tier info (free/budget/sme) and trial status.
 * On first load, ensures a trial is granted for new users.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import type { UserTier, TierInfo } from "@/utils/tierGate";
import { getTierInfo, getTrialDays } from "@/utils/tierGate";
import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";
import { reportError } from "@/utils/telemetry";

type TierContextValue = {
  tier: UserTier;
  effectiveTier: UserTier;
  isOnTrial: boolean;
  trialEndsAt: string | null;
  canAccessBudget: boolean;
  canAccessSME: boolean;
  pendingTier: UserTier | null;
  pendingTierStartDate: string | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  refreshTier: () => Promise<void>;
};

const TierContext = createContext<TierContextValue | null>(null);

const FIRST_100_TRIAL_DAYS = 60;
const DEFAULT_TRIAL_DAYS = 30;

export function TierProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tierInfo, setTierInfo] = useState<TierInfo>({
    tier: "free",
    effectiveTier: "free",
    isOnTrial: false,
    trialEndsAt: null,
    canAccessBudget: false,
    canAccessSME: false,
    pendingTier: null,
    pendingTierStartDate: null,
    cancelAtPeriodEnd: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadTier = useCallback(async () => {
    if (!user?.id || !supabase) {
      setTierInfo({
        tier: "free",
        effectiveTier: "free",
        isOnTrial: false,
        trialEndsAt: null,
        canAccessBudget: false,
        canAccessSME: false,
        pendingTier: null,
        pendingTierStartDate: null,
        cancelAtPeriodEnd: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      const [rpcResult, subResult] = await Promise.all([
        supabase.rpc("get_user_count"),
        supabase
          .from("subscriptions")
          .select(
            "plan, status, trial_ends_at, pending_tier, pending_tier_start_date, cancel_at_period_end"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const { data: userCount, error: rpcError } = rpcResult;
      if (rpcError) {
        reportError(rpcError, {
          feature: "tier",
          operation: "rpc_get_user_count",
          extra: { code: rpcError.code },
        });
      }
      const isEarlyBird = !rpcError && (userCount ?? 999) < 100;
      const trialDays = getTrialDays(isEarlyBird);

      const { data: sub, error: subError } = subResult;

      if (subError) {
        reportError(subError, {
          feature: "tier",
          operation: "fetch_subscription",
          extra: { code: subError.code },
        });
        setTierInfo(getTierInfo("free", null));
        return;
      }

      if (!sub) {
        // First login ever — create trial subscription
        const trialEndsAt = new Date(Date.now() + trialDays * 86400000).toISOString();

        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: user.id,
              plan: "sme",
              status: "trial",
              trial_ends_at: trialEndsAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (upsertError) {
          reportError(upsertError, {
            feature: "tier",
            operation: "create_trial_subscription",
            extra: { code: upsertError.code },
          });
          setTierInfo(getTierInfo("free", null));
          return;
        }

        setTierInfo(getTierInfo("sme", trialEndsAt));
        return;
      }

      // 3. Existing subscription — compute tier
      const tier = (sub.plan as UserTier) || "free";
      const trialEndsAt = sub.trial_ends_at;
      let pendingTier = sub.pending_tier as UserTier | null;
      let pendingTierStartDate = sub.pending_tier_start_date;
      const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;

      const now = new Date();

      // 4. Janitor — activate pending tier if date reached AND trial is over
      if (pendingTier && pendingTierStartDate) {
        const startDate = new Date(pendingTierStartDate.replace(' ', 'T'));
        const trialExpiryString = trialEndsAt?.replace(' ', 'T');
        const trialExpiry = trialExpiryString ? new Date(trialExpiryString) : null;

        const isAtActivationTime = !isNaN(startDate.getTime()) && startDate <= now;
        const isTrialOver = !trialExpiry || isNaN(trialExpiry.getTime()) || trialExpiry <= now;

        if (isAtActivationTime && isTrialOver) {
          log.info(`[Janitor] Activating pending tier: ${pendingTier}`);

          const { error: updateError } = await supabase
            .from("subscriptions")
            .update({
              plan: pendingTier,
              status: pendingTier === "free" ? "expired" : "active",
              pending_tier: null,
              pending_tier_start_date: null,
              cancel_at_period_end: false,
              updated_at: now.toISOString(),
            })
            .eq("user_id", user.id);

          if (updateError) {
            reportError(updateError, {
              feature: "tier",
              operation: "janitor_activate_pending",
              extra: { code: updateError.code, pendingTier },
            });
            // Fall through: keep tier from current row rather than assuming activation.
          } else {
            setTierInfo(getTierInfo(pendingTier, trialEndsAt, null, null, false));
            return;
          }
        }
      }

      // Expire trials with no pending tier
      if (!pendingTier && trialEndsAt) {
        const trialExpiry = trialEndsAt.includes(' ')
          ? new Date(trialEndsAt.replace(' ', 'T'))
          : new Date(trialEndsAt);

        if (!isNaN(trialExpiry.getTime()) && trialExpiry <= now && tier !== "free") {
          const { error: expireError } = await supabase
            .from("subscriptions")
            .update({
              status: "expired",
              updated_at: now.toISOString(),
            })
            .eq("user_id", user.id);

          if (expireError) {
            reportError(expireError, {
              feature: "tier",
              operation: "expire_trial",
              extra: { code: expireError.code },
            });
          } else {
            log.info(`[Tier] Expired trial for user: ${user.id}`);
            setTierInfo(getTierInfo("free", trialEndsAt, null, null, false));
            return;
          }
        }
      }

      setTierInfo(
        getTierInfo(tier, trialEndsAt, pendingTier, pendingTierStartDate, cancelAtPeriodEnd)
      );
    } catch (err) {
      log.error("Fatal error in loadTier:", err);
      setTierInfo(getTierInfo("free", null));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTier();
  }, [loadTier]);

  return (
    <TierContext.Provider
      value={{
        tier: tierInfo.tier,
        effectiveTier: tierInfo.effectiveTier,
        isOnTrial: tierInfo.isOnTrial,
        trialEndsAt: tierInfo.trialEndsAt,
        canAccessBudget: tierInfo.canAccessBudget,
        canAccessSME: tierInfo.canAccessSME,
        pendingTier: tierInfo.pendingTier ?? null,
        pendingTierStartDate: tierInfo.pendingTierStartDate ?? null,
        cancelAtPeriodEnd: tierInfo.cancelAtPeriodEnd ?? false,
        isLoading,
        refreshTier: loadTier,
      }}
    >
      {children}
    </TierContext.Provider>
  );
}

export function useTierContext(): TierContextValue {
  const context = useContext(TierContext);
  if (!context) {
    throw new Error("useTierContext must be used within TierProvider");
  }
  return context;
}
