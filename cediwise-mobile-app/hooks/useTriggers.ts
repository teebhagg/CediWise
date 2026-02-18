import type { TriggerId } from "@/constants/triggers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export type TriggerContext = {
  incomeSourceCount: number;
  savingsAmount: number;
  needsAmount: number;
  viewedModuleId?: string;
  hasVatTransaction?: boolean;
  forceHomeIntro?: boolean;
};

export function useTriggers(context: TriggerContext) {
  const { user } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<Set<TriggerId>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(!user?.id);
  const [pendingTrigger, setPendingTrigger] = useState<TriggerId | null>(null);
  const hasShownThisSession = useRef(false);

  const loadDismissed = useCallback(async () => {
    if (!user?.id || !supabase) {
      setDismissedLoaded(true);
      return;
    }
    try {
      const { data } = await supabase
        .from("trigger_dismissals")
        .select("trigger_id")
        .eq("user_id", user.id);
      const ids = new Set((data ?? []).map((r) => r.trigger_id as TriggerId));
      setDismissedIds(ids);
    } catch {
      // Offline or error
    } finally {
      setDismissedLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) setDismissedLoaded(true);
    else loadDismissed();
  }, [loadDismissed, user?.id]);

  const dismissTrigger = useCallback(
    async (triggerId: TriggerId) => {
      setPendingTrigger(null);
      if (!user?.id || !supabase) return;
      try {
        await supabase.from("trigger_dismissals").upsert(
          {
            user_id: user.id,
            trigger_id: triggerId,
            dismissed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,trigger_id" }
        );
        setDismissedIds((prev) => new Set([...prev, triggerId]));
      } catch {
        setDismissedIds((prev) => new Set([...prev, triggerId]));
      }
    },
    [user?.id]
  );

  const evaluateTriggers = useCallback(() => {
    // Force home intro for testing (always show, ignore dismissal)
    if (context.forceHomeIntro) {
      setPendingTrigger("CTX_HOME_INTRO");
      return;
    }

    if (!dismissedLoaded) return;
    if (hasShownThisSession.current) return;

    const candidates: TriggerId[] = [];

    if (
      context.incomeSourceCount === 1 &&
      !dismissedIds.has("CTX_SALARY_FIRST")
    ) {
      candidates.push("CTX_SALARY_FIRST");
    }

    if (
      context.needsAmount > 0 &&
      context.savingsAmount < context.needsAmount &&
      !dismissedIds.has("CTX_LOW_SAVINGS")
    ) {
      candidates.push("CTX_LOW_SAVINGS");
    }

    if (
      context.viewedModuleId === "MOD-06" &&
      !dismissedIds.has("CTX_TBILL_VIEW")
    ) {
      candidates.push("CTX_TBILL_VIEW");
    }

    if (context.hasVatTransaction && !dismissedIds.has("CTX_VAT_ALERT")) {
      candidates.push("CTX_VAT_ALERT");
    }

    const trigger = candidates[0] ?? null;
    if (trigger) {
      hasShownThisSession.current = true;
      setPendingTrigger(trigger);
    }
  }, [context, dismissedIds, dismissedLoaded]);

  useEffect(() => {
    evaluateTriggers();
  }, [evaluateTriggers]);

  const onLearnMore = useCallback((triggerId: TriggerId, ctaRoute?: string) => {
    setPendingTrigger(null);
    if (ctaRoute) router.push(ctaRoute as any);
  }, []);

  return {
    pendingTrigger,
    dismissTrigger,
    onLearnMore,
  };
}
