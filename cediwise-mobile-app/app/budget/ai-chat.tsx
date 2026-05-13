import { AIUnifiedChatPanel } from "@/components/features/ai/AIUnifiedChatPanel";
import { useBudgetScreenState } from "@/components/features/budget/useBudgetScreenState";
import { useTierContext } from "@/contexts/TierContext";
import { useAIBudgetAnalysis } from "@/hooks/useAIBudgetAnalysis";
import { useDebts } from "@/hooks/useDebts";
import { useAIChatFabTransitionStore } from "@/stores/aiChatFabTransitionStore";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";

export default function BudgetAIChatScreen() {
  const router = useRouter();
  const { user, budget, derived, ui } = useBudgetScreenState();
  const { canAccessBudget } = useTierContext();
  const { initialMessage, context_type, draftMessage } = useLocalSearchParams<{
    initialMessage?: string;
    context_type?: "budget" | "debt";
    draftMessage?: string;
  }>();

  const { insights: debtInsights, recordPayment: recordDebtPayment, debts } = useDebts(budget.totals?.monthlyNetIncome);

  const aiBudget = useAIBudgetAnalysis({
    userId: user?.id,
    activeCycleId: derived.activeCycleId,
    budgetState: budget.state,
    enabled: !!user && canAccessBudget && derived.cycleIsSet,
  });

  const allowed =
    !!user && canAccessBudget && derived.cycleIsSet && !!derived.activeCycleId;

  const closeChat = useCallback(() => {
    router.back();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        closeChat();
        return true;
      });
      return () => {
        sub.remove();
        useAIChatFabTransitionStore.getState().releaseFabMorphIfStale();
      };
    }, [closeChat]),
  );

  useEffect(() => {
    if (!allowed) router.back();
  }, [allowed, router]);

  if (!allowed) {
    return (
      <View className="flex-1 bg-[#020617] items-center justify-center">
        <ActivityIndicator color="#10b981" />
        <Text className="text-white/60 text-xs mt-2">Leaving…</Text>
      </View>
    );
  }

  return (
    <AIUnifiedChatPanel
      userId={user?.id}
      timezone={aiBudget.ianaTimezone}
      categories={derived.cycleCategories}
      activeCycleId={derived.activeCycleId}
      contextType={context_type || "budget"}
      healthScore={
        ui.budgetHealthScore?.score != null
          ? { score: ui.budgetHealthScore.score }
          : null
      }
      addTransaction={budget.addTransaction}
      updateCategoryLimit={budget.updateCategoryLimit}
      addCategory={budget.addCategory}
      updateCycleAllocation={budget.updateCycleAllocation}
      // Debt props
      debts={debts}
      debtToIncomeRatio={debtInsights.debtToIncomeRatio ?? undefined}
      recordDebtPayment={recordDebtPayment}
      onClose={closeChat}
      initialMessage={initialMessage}
      initialDraft={draftMessage}
    />
  );
}
