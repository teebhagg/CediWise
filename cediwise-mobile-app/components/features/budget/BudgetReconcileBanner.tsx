import { getReconcileBannerMessage } from "@/utils/budgetReconcileBanner";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import { X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

type Props = {
  validation: BudgetPlanValidationResult;
  onFix: () => void;
  onDismiss: () => void;
};

export function BudgetReconcileBanner({ validation, onFix, onDismiss }: Props) {
  const message = getReconcileBannerMessage(validation);

  return (
    <View className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex-row items-start gap-3">
      <Pressable onPress={onFix} className="flex-1" accessibilityRole="button">
        <Text className="text-amber-200 text-sm font-medium leading-5">
          {message}
        </Text>
        <Text className="text-amber-300/80 text-xs mt-1 font-medium">
          Fix now
        </Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss banner"
      >
        <X size={18} color="#FCD34D" />
      </Pressable>
    </View>
  );
}
