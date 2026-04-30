import { useAppToast } from "@/hooks/useAppToast";
import { log } from "@/utils/logger";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { ListGroup, PressableFeedback, Separator } from "heroui-native";

import { useBudgetScreenState } from "./useBudgetScreenState";

const LIST_GROUP_CONTAINER_CLASS =
  "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";

const OPTIONS = [
  {
    value: "recommend_only" as const,
    title: "Recommend only",
    description: "Show suggestions, but let me approve everything.",
  },
  {
    value: "auto_apply_safe_rules" as const,
    title: "Auto-apply safe rules",
    description: "Automatically move unspent money to Savings.",
  },
  {
    value: "manual_off" as const,
    title: "Manual / off",
    description: "Turn off engine suggestions and automatic actions.",
  },
];

export function BudgetEngineModeList() {
  const { showError } = useAppToast();
  const { derived, budget } = useBudgetScreenState();
  const [loading, setLoading] = useState(false);
  const currentMode = derived.budgetEngineMode ?? "auto_apply_safe_rules";

  const onItemPress = useCallback((fn: () => void) => async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    fn();
  }, []);

  const onSelect = useCallback(
    async (mode: (typeof OPTIONS)[number]["value"]) => {
      if (loading || currentMode === mode) return;
      setLoading(true);
      try {
        await budget.updateBudgetEngineMode(mode);
      } catch (e) {
        log.error("Budget engine mode update failed:", e);
        showError("Error", "Could not update budget engine mode");
      } finally {
        setLoading(false);
      }
    },
    [budget, currentMode, loading, showError],
  );

  return (
    <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
      {OPTIONS.map((opt, index) => (
        <View key={opt.value}>
          {index > 0 ? <Separator className="mx-4" /> : null}
          <PressableFeedback
            animation={false}
            onPress={onItemPress(() => onSelect(opt.value))}
          >
            <PressableFeedback.Scale />
            <PressableFeedback.Ripple />
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl border ${
                    currentMode === opt.value
                      ? "border-emerald-400/60 bg-emerald-500/20"
                      : "border-slate-400/20 bg-slate-500/15"
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      currentMode === opt.value
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {currentMode === opt.value ? "•" : "○"}
                  </Text>
                </View>
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{opt.title}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {opt.description}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix>
                {loading && currentMode === opt.value ? (
                  <Text className="text-sm text-slate-400">Updating…</Text>
                ) : null}
              </ListGroup.ItemSuffix>
            </ListGroup.Item>
          </PressableFeedback>
        </View>
      ))}
    </ListGroup>
  );
}
