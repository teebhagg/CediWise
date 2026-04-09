import type { BudgetPreferencePercents } from "@/utils/budgetPreferenceTypes";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type BudgetAllocationPercents = BudgetPreferencePercents;

function pctLabel(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export type MigrationPromptProps = {
  visible: boolean;
  lifeStagePhrase: string;
  financialPriorityPhrase: string;
  currentAllocations: BudgetAllocationPercents;
  suggestedAllocations: BudgetAllocationPercents;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export function MigrationPrompt({
  visible,
  lifeStagePhrase,
  financialPriorityPhrase,
  currentAllocations,
  suggestedAllocations,
  onConfirm,
  onCancel,
}: MigrationPromptProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const handleCancel = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    if (!busy) onCancel();
  }, [busy, onCancel]);

  const handleConfirm = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }, [onConfirm]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}>
      <View
        className="flex-1 justify-end bg-black/70 px-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <View className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
          <Text className="text-lg font-semibold text-white">
            Update your budget?
          </Text>
          <Text className="mt-3 text-sm leading-5 text-neutral-300">
            Your current split doesn’t match your profile preferences. Apply
            a suggested split that better fits your{" "}
            <Text className="font-medium text-white">{lifeStagePhrase}</Text>{" "}
            situation and{" "}
            <Text className="font-medium text-white">
              {financialPriorityPhrase}
            </Text>{" "}
            focus?
          </Text>

          <View className="mt-5 gap-4">
            <View>
              <Text className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Current
              </Text>
              <Text className="mt-1 text-sm text-neutral-200">
                Needs {pctLabel(currentAllocations.needsPct)} · Wants{" "}
                {pctLabel(currentAllocations.wantsPct)} · Savings{" "}
                {pctLabel(currentAllocations.savingsPct)}
              </Text>
            </View>
            <View>
              <Text className="text-xs font-medium uppercase tracking-wide text-emerald-500/90">
                Suggested
              </Text>
              <Text className="mt-1 text-sm text-emerald-100">
                Needs {pctLabel(suggestedAllocations.needsPct)} · Wants{" "}
                {pctLabel(suggestedAllocations.wantsPct)} · Savings{" "}
                {pctLabel(suggestedAllocations.savingsPct)}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleCancel}
              className="min-h-[48px] flex-1 items-center justify-center rounded-xl bg-neutral-800 px-4 active:opacity-80">
              <Text className="font-semibold text-neutral-200">Keep current</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleConfirm}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 active:opacity-90">
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Update budget</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
