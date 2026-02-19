import { TriggerNudgeModal } from "@/components/features/literacy/TriggerNudgeModal";
import { TRIGGER_CONFIGS } from "@/constants/triggers";
import { useAuth } from "@/hooks/useAuth";
import { useBudget } from "@/hooks/useBudget";
import { useTriggers } from "@/hooks/useTriggers";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type TriggerContextValue = {
  setViewedModuleId: (moduleId: string | undefined) => void;
  setHasVatTransaction: (value: boolean) => void;
};

const TriggerContext = createContext<TriggerContextValue | null>(null);

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { state: budgetState, totals: budgetTotals } = useBudget(user?.id);
  const [viewedModuleId, setViewedModuleIdState] = useState<string | undefined>();
  const [hasVatTransaction, setHasVatTransaction] = useState(false);

  const setViewedModuleId = useCallback((id: string | undefined) => {
    setViewedModuleIdState(id);
  }, []);

  const context: Parameters<typeof useTriggers>[0] = useMemo(
    () => ({
      incomeSourceCount: budgetState?.incomeSources?.length ?? 0,
      savingsAmount: budgetTotals?.savingsLimit ?? 0,
      needsAmount: budgetTotals?.needsLimit ?? 0,
      viewedModuleId,
      hasVatTransaction,
      enableTriggers: false,
    }),
    [
      budgetState?.incomeSources?.length,
      budgetTotals?.savingsLimit,
      budgetTotals?.needsLimit,
      viewedModuleId,
      hasVatTransaction,
    ]
  );

  const { pendingTrigger, dismissTrigger, onLearnMore } = useTriggers(context);

  const config = pendingTrigger ? TRIGGER_CONFIGS[pendingTrigger] : null;

  const handleDismiss = useCallback(() => {
    if (pendingTrigger) {
      dismissTrigger(pendingTrigger);
    }
  }, [pendingTrigger, dismissTrigger]);

  const handleLearnMore = useCallback(() => {
    if (pendingTrigger && config) {
      onLearnMore(pendingTrigger, config.ctaRoute);
      dismissTrigger(pendingTrigger);
    }
  }, [pendingTrigger, config, onLearnMore, dismissTrigger]);

  const value = useMemo(
    () => ({ setViewedModuleId, setHasVatTransaction }),
    [setViewedModuleId]
  );

  return (
    <TriggerContext.Provider value={value}>
      {children}
      {config && (
        <TriggerNudgeModal
          title={config.title}
          message={config.message}
          ctaLabel={config.ctaLabel}
          onDismiss={handleDismiss}
          onLearnMore={handleLearnMore}
        />
      )}
    </TriggerContext.Provider>
  );
}

export function useTriggerContext() {
  const ctx = useContext(TriggerContext);
  if (!ctx) return { setViewedModuleId: () => { }, setHasVatTransaction: () => { } };
  return ctx;
}
