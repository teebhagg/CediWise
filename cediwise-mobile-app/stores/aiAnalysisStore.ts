import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  expandAnalysis,
  type AIBudgetAnalysis,
  type AIAnalysisCompact,
} from "@/types/ai";
import { analytics } from "@/utils/analytics";
import { supabase } from "@/utils/supabase";

const CACHE_PREFIX = "cediwise_ai_analysis";

type AnalysisPersist = {
  fingerprint: string;
  analysis: AIBudgetAnalysis;
  savedAt: number;
};

type AIAnalysisStoreState = {
  analysis: AIBudgetAnalysis | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  serverInputHash: string | null;
  /** Matches last successful fetch fingerprint (see buildBudgetCycleFingerprint). */
  fingerprint: string | null;
};

type AIAnalysisStoreActions = {
  markStaleFromBudgetChange: () => void;
  clear: () => void;
  hydrateFromDisk: (
    userId: string | null | undefined,
    fingerprint: string,
  ) => Promise<void>;
  fetchAnalysis: (args: {
    userId: string;
    accessToken: string;
    fingerprint: string;
    force?: boolean;
  }) => Promise<void>;
};

function diskKey(userId: string): string {
  return `${CACHE_PREFIX}_${userId}`;
}

function isLikelyRpcError(payload: unknown): payload is {
  error?: string;
  detail?: string;
} {
  return (
    !!payload &&
    typeof payload === "object" &&
    ("error" in payload || "detail" in payload)
  );
}

export const useAIAnalysisStore = create<
  AIAnalysisStoreState & AIAnalysisStoreActions
>((set, get) => ({
  analysis: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  serverInputHash: null,
  fingerprint: null,

  markStaleFromBudgetChange: () => {
    set({ fingerprint: null, lastFetchedAt: null });
  },

  clear: () =>
    set({
      analysis: null,
      error: null,
      lastFetchedAt: null,
      serverInputHash: null,
      fingerprint: null,
      isLoading: false,
    }),

  hydrateFromDisk: async (userId, fingerprint) => {
    if (!userId) return;
    try {
      const raw = await AsyncStorage.getItem(diskKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as AnalysisPersist;
      if (parsed?.fingerprint === fingerprint && parsed?.analysis) {
        set({
          analysis: parsed.analysis,
          fingerprint: parsed.fingerprint,
        });
      }
    } catch {
      /* noop */
    }
  },

  fetchAnalysis: async ({ userId, accessToken, fingerprint, force }) => {
    const now = Date.now();
    const s = get();
    if (
      !force &&
      s.lastFetchedAt != null &&
      now - s.lastFetchedAt < 5 * 60 * 1000 &&
      s.analysis &&
      s.fingerprint === fingerprint &&
      !s.error
    ) {
      return;
    }

    if (!supabase || !accessToken) {
      set({ error: "not_configured", isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    analytics.aiAnalysisRequested({ fingerprint });

    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-analyze-budget",
        {
          body: {},
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const payloadUnknown = error ? data : data;
      if (error || isLikelyRpcError(payloadUnknown)) {
        const p = payloadUnknown as {
          error?: string;
          detail?: string;
        };
        const errMsg =
          typeof p?.detail === "string"
            ? p.detail
            : typeof p?.error === "string"
              ? p.error
              : error?.message ?? "fetch_failed";
        analytics.aiAnalysisError({ message: errMsg });
        set({
          isLoading: false,
          error: errMsg,
        });
        return;
      }

      const payload = payloadUnknown as {
        cached?: boolean;
        modelUsed?: string;
        inputHash?: string;
        result?: AIAnalysisCompact;
      };

      if (!payload.result) {
        analytics.aiAnalysisError({ message: "empty_result" });
        set({ isLoading: false, error: "empty_result" });
        return;
      }

      const expanded = expandAnalysis(payload.result, {
        modelUsed: payload.modelUsed,
        generatedAt: new Date().toISOString(),
        cached: payload.cached,
      });

      set({
        analysis: expanded,
        isLoading: false,
        error: null,
        lastFetchedAt: now,
        serverInputHash: payload.inputHash ?? null,
        fingerprint,
      });

      analytics.aiAnalysisReceived({
        cached: payload.cached ?? false,
        inputHash: payload.inputHash ?? "",
        modelUsed: payload.modelUsed ?? "",
      });

      const persistPayload: AnalysisPersist = {
        fingerprint,
        analysis: expanded,
        savedAt: now,
      };
      await AsyncStorage.setItem(
        diskKey(userId),
        JSON.stringify(persistPayload),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      analytics.aiAnalysisError({ message: msg });
      set({ isLoading: false, error: msg });
    }
  },
}));
