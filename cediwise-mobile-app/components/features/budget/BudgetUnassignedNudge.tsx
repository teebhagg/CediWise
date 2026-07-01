import { formatCurrency } from "@/utils/formatCurrency";
import { Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";

type Props = {
  unassigned: number;
  takeHome: number;
  onAssignToSavings: () => void;
  onDismiss: () => void;
};

export function BudgetUnassignedNudge({
  unassigned,
  takeHome,
  onAssignToSavings,
  onDismiss,
}: Props) {
  const pct = takeHome > 0 ? (unassigned / takeHome) * 100 : 0;
  if (pct <= 10) return null;

  return (
    <View className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 flex-row items-start gap-3">
      <View className="flex-1">
        <Text className="text-sky-100 text-sm leading-5">
          You have ₵{formatCurrency(unassigned)} unassigned ({Math.round(pct)}%
          of take-home). Consider assigning it to Savings.
        </Text>
        <Pressable onPress={onAssignToSavings} className="mt-2">
          <Text className="text-sky-300 text-sm font-semibold">
            Assign to Savings
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss">
        <X size={18} color="#7DD3FC" />
      </Pressable>
    </View>
  );
}
