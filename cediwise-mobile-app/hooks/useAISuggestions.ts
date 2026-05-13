import { useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { analytics } from "@/utils/analytics";
import type { AIProfileSuggestions, AISuggestionCategory, AISuggestionRecurring, AISuggestionGoal } from "@/types/ai";
import { log } from "@/utils/logger";

export interface UseAISuggestionsParams {
  salary: string;
  autoTax: boolean;
  incomeFrequency: string;
  lifeStage: string | null;
  spendingStyle: string | null;
  financialPriority: string | null;
  interests: string[];
  existingRecurring: string[];
  country?: string;
}

async function resolveAccessToken(): Promise<string | null> {
  await refreshStoredSession();
  const s = await getStoredAuthData();
  return s?.accessToken ?? null;
}

export function useAISuggestions() {
  const [suggestions, setSuggestions] = useState<AIProfileSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (params: UseAISuggestionsParams) => {
    setIsLoading(true);
    setError(null);
    analytics.track("ai_suggestions_requested", {
      lifeStage: params.lifeStage,
      priority: params.financialPriority
    });

    try {
      const token = await resolveAccessToken();
      if (!token || !supabase) {
        throw new Error("auth_not_configured");
      }

      const salaryValue = parseFloat(params.salary.replace(/,/g, ""));
      if (isNaN(salaryValue)) {
        throw new Error("invalid_salary");
      }

      const { data, error: rpcError } = await supabase.functions.invoke("ai-suggest-profile", {
        body: {
          salary: parseFloat(params.salary.replace(/,/g, "")) || 0,
          autoTax: params.autoTax,
          incomeFrequency: params.incomeFrequency,
          lifeStage: params.lifeStage,
          spendingStyle: params.spendingStyle,
          financialPriority: params.financialPriority,
          interests: params.interests,
          existingRecurring: params.existingRecurring,
          country: params.country ?? "GH"
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (rpcError) throw rpcError;

      if (!data || !data.suggestions) {
        throw new Error("Invalid response from AI service");
      }

      // Wrap suggestions with 'accepted' state
      const raw = data.suggestions;
      const wrapped: AIProfileSuggestions = {
        ...raw,
        categories: (raw.categories || []).map((c: any) => ({ ...c, accepted: false })),
        recurringExpenses: (raw.recurringExpenses || []).map((r: any) => ({ ...r, accepted: false })),
        goals: (raw.goals || []).map((g: any, idx: number) => ({
          ...g,
          id: g.id || `goal-${idx}-${Date.now()}`,
          accepted: false,
        })),
        economicContext: data.economicContext
      };

      setSuggestions(wrapped);
      analytics.track("ai_suggestions_received", {
        categoryCount: wrapped.categories.length,
        recurringCount: wrapped.recurringExpenses.length
      });
      return wrapped;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.error("[useAISuggestions]", msg);
      setError(msg);
      analytics.track("ai_suggestions_error", { message: msg });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, accepted: !c.accepted } : c)
      };
    });
  }, []);

  const toggleRecurring = useCallback((id: string) => {
    setSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        recurringExpenses: prev.recurringExpenses.map(r => r.id === id ? { ...r, accepted: !r.accepted } : r)
      };
    });
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setSuggestions(prev => {
      if (!prev) return null;
      return {
        ...prev,
        goals: prev.goals.map(g => g.id === id ? { ...g, accepted: !g.accepted } : g)
      };
    });
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    toggleCategory,
    toggleRecurring,
    toggleGoal,
    clearSuggestions
  };
}
