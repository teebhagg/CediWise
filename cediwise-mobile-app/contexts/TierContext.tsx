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
      // 1. Fetch profile first (Most Critical Data)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("tier, trial_ends_at, trial_granted, pending_tier, pending_tier_start_date")
        .eq("id", user.id)
        .single();

      if (error) {
        log.warn("Failed to load profile info:", error.message);
        setTierInfo(getTierInfo("free", null));
        return;
      }

      // 2. Fetch subscription separately (Non-blocking)
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? false;

      // Ensure trial for new users
      if (!profile?.trial_granted) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("trial_granted", true);

        const isEarlyBird = (count ?? 0) < 100;
        const trialDays = getTrialDays(isEarlyBird);
        const trialEndsAt = new Date(
          Date.now() + trialDays * 86400000
        ).toISOString();

        await supabase
          .from("profiles")
          .update({
            trial_granted: true,
            trial_ends_at: trialEndsAt,
            tier: "sme",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        // Also create subscription row
        await supabase
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

        setTierInfo(getTierInfo("sme", trialEndsAt));
      } else {
        const tier = (profile?.tier as UserTier) || "free";
        const trialEndsAt = profile?.trial_ends_at || null;
        let pendingTier = (profile?.pending_tier as UserTier) || null;
        let pendingTierStartDate = profile?.pending_tier_start_date || null;

        if (pendingTier && pendingTierStartDate) {
          const now = new Date();
          const startDate = new Date(pendingTierStartDate.replace(' ', 'T'));
          const trialExpiryString = trialEndsAt?.replace(' ', 'T');
          const trialExpiry = trialExpiryString ? new Date(trialExpiryString) : null;
          
          const isAtActivationTime = !isNaN(startDate.getTime()) && startDate <= now;
          const isTrialOver = !trialExpiry || isNaN(trialExpiry.getTime()) || trialExpiry <= now;

          if (isAtActivationTime && isTrialOver) {
            log.info(`[Janitor] Activating pending tier: ${pendingTier}`);
            
            await supabase
              .from("profiles")
              .update({
                tier: pendingTier,
                pending_tier: null,
                pending_tier_start_date: null,
                updated_at: new Date().toISOString()
              })
              .eq("id", user.id);

            setTierInfo({
              ...getTierInfo(pendingTier, trialEndsAt, null, null, false),
              pendingTier: null,
              pendingTierStartDate: null,
              cancelAtPeriodEnd: false,
            });
            return;
          }
        }

        setTierInfo(
          getTierInfo(tier, trialEndsAt, pendingTier, pendingTierStartDate, cancelAtPeriodEnd)
        );
      }
    } catch (err) {
      log.error("Fatal error in TierProvider:", err);
      // Fallback but preserve 'tier' if we have it
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
