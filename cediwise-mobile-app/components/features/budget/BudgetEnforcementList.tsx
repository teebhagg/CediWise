import { useAppToast } from "@/hooks/useAppToast";
import { trackBudgetEnforcementChanged } from "@/utils/budgetAnalytics";
import { useBudgetScreenState } from "@/components/features/budget/useBudgetScreenState";
import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { ListGroup, PressableFeedback, Separator } from "heroui-native";

const LIST_GROUP_CONTAINER_CLASS =
  "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";

const OPTIONS = [
  {
    value: "strict" as const,
    title: "Strict",
    description: "Don't allow plans over my take-home pay.",
  },
  {
    value: "flexible" as const,
    title: "Flexible",
    description: "Warn me, but let me proceed after I confirm.",
  },
];

export function BudgetEnforcementList() {
  const { showInfo } = useAppToast();
  const { derived, budget } = useBudgetScreenState();
  const [loading, setLoading] = useState(false);
  const isUpdatingRef = useRef(false);
  const current = derived.budgetEnforcement ?? "strict";

  const onSelect = useCallback(
    async (mode: (typeof OPTIONS)[number]["value"]) => {
      if (loading || current === mode || isUpdatingRef.current) return;
      isUpdatingRef.current = true;
      setLoading(true);
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore
      }
      try {
        await budget.updateBudgetEnforcement(mode);
        if (current !== mode) {
          trackBudgetEnforcementChanged({ from: current, to: mode });
        }
      } catch {
        showInfo("Saved locally", "Budget strictness was updated on this device.");
      } finally {
        isUpdatingRef.current = false;
        setLoading(false);
      }
    },
    [budget, current, loading, showInfo],
  );

  return (
    <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
      {OPTIONS.map((opt, index) => (
        <View key={opt.value}>
          {index > 0 ? <Separator className="mx-4" /> : null}
          <PressableFeedback
            animation={false}
            onPress={() => onSelect(opt.value)}
          >
            <PressableFeedback.Scale />
            <PressableFeedback.Ripple />
            <ListGroup.Item disabled={loading}>
              <ListGroup.ItemPrefix>
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl border ${
                    current === opt.value
                      ? "border-emerald-400/60 bg-emerald-500/20"
                      : "border-slate-400/20 bg-slate-500/15"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      current === opt.value ? "text-emerald-300" : "text-slate-400"
                    }`}
                  >
                    {current === opt.value ? "•" : "○"}
                  </Text>
                </View>
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{opt.title}</ListGroup.ItemTitle>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {opt.description}
                </Text>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </PressableFeedback>
        </View>
      ))}
    </ListGroup>
  );
}
