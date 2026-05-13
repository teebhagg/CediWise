import { buildBudgetCycleFingerprint } from "@/calculators/aiContextBuilder";
import type { BudgetState } from "@/types/budget";
import { useAIAnalysisStore } from "@/stores/aiAnalysisStore";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { log } from "@/utils/logger";
import { BUDGET_CHANGED_EVENT } from "@/utils/budgetStorage";
import * as Localization from "expo-localization";
import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect } from "react";

interface UseAIBudgetAnalysisParams {
  userId: string | null | undefined;
  activeCycleId: string | null | undefined;
  budgetState: BudgetState | null | undefined;
  enabled: boolean;
}

async function resolveAccessToken(): Promise<string | null> {
  await refreshStoredSession();
  const s = await getStoredAuthData();
  return s?.accessToken ?? null;
}

/** Loads AI budget insights via `ai-analyze-budget`; ignores duplicate fetches when debounced in store. */
export function useAIBudgetAnalysis(params: UseAIBudgetAnalysisParams) {
  const { userId, activeCycleId, budgetState, enabled } = params;

  const fetchAnalysis = useAIAnalysisStore((state) => state.fetchAnalysis);
  const hydrateFromDisk = useAIAnalysisStore((state) => state.hydrateFromDisk);
  const markStale = useAIAnalysisStore((state) => state.markStaleFromBudgetChange);

  const analysis = useAIAnalysisStore((state) => state.analysis);
  const isLoading = useAIAnalysisStore((state) => state.isLoading);
  const error = useAIAnalysisStore((state) => state.error);

  const fingerprint = activeCycleId
    ? buildBudgetCycleFingerprint({
        cycleId: activeCycleId,
        state: budgetState ?? null,
      })
    : "";

  const refresh = useCallback(
    async (force?: boolean) => {
      if (!enabled || !userId || !activeCycleId || !fingerprint) {
        return;
      }
      const token = await resolveAccessToken();
      if (!token) return;
      await fetchAnalysis({
        userId,
        accessToken: token,
        fingerprint,
        force,
      });
    },
    [activeCycleId, enabled, fetchAnalysis, fingerprint, userId],
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      BUDGET_CHANGED_EVENT,
      (evt: { userId?: string }) => {
        if (evt?.userId && evt.userId === userId) {
          markStale();
        }
      },
    );
    return () => sub.remove();
  }, [markStale, userId]);

  useEffect(() => {
    if (!enabled || !userId || !fingerprint) return;
    void hydrateFromDisk(userId, fingerprint);
  }, [enabled, hydrateFromDisk, userId, fingerprint]);

  useEffect(() => {
    if (!enabled || !userId || !activeCycleId || !fingerprint) {
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await resolveAccessToken();
      if (!token || cancelled) return;
      await fetchAnalysis({
        userId,
        accessToken: token,
        fingerprint,
      });
    })().catch((e) =>
      log.warn("[useAIBudgetAnalysis]", e instanceof Error ? e.message : e),
    );
    return () => {
      cancelled = true;
    };
  }, [activeCycleId, enabled, fetchAnalysis, fingerprint, userId]);

  return {
    analysis,
    isLoading,
    error,
    refresh,
    /** IANA TZ for ai-chat daily limits header. */
    ianaTimezone: Localization.getCalendars()[0]?.timeZone ?? "Africa/Accra",
  };
}
