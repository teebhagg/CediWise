import type { BudgetBucket } from "@/types/budget";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import { formatCurrency } from "@/utils/formatCurrency";
import { Pressable, Text, View } from "react-native";

type Props = {
  validation: BudgetPlanValidationResult;
  onBucketPress?: (bucket: BudgetBucket) => void;
};

const BUCKET_LABELS = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
} as const;

function statusColor(status: "ok" | "over" | "under"): string {
  if (status === "over") return "#F87171";
  if (status === "under") return "#94A3B8";
  return "#34D399";
}

export function BudgetReconciliationSummary({ validation, onBucketPress }: Props) {
  const overallOver = validation.violations.some(
    (v) => v.type === "L3" || v.type === "L4",
  );
  const anyBucketOver = validation.violations.some((v) => v.type === "L2");

  return (
    <View className="rounded-lg py-8 border border-slate-700/60 bg-slate-900/80 p-5 gap-3">
      <View>
        <Text className="text-slate-400 text-xs uppercase tracking-wide">
          Take-home pay
        </Text>
        <Text className="text-white text-lg font-semibold">
          ₵{formatCurrency(validation.takeHome)}
        </Text>
      </View>

      {(["needs", "wants", "savings"] as const).map((bucket) => {
        const row = validation.buckets[bucket];
        const color = statusColor(row.status);
        const content = (
          <>
            <Text className="text-slate-300 text-sm">{BUCKET_LABELS[bucket]}</Text>
            <Text className="text-sm" style={{ color }}>
              ₵{formatCurrency(row.allocated)} / ₵{formatCurrency(row.envelope)}
              {row.status === "over"
                ? ` · ₵${formatCurrency(row.overflow)} over`
                : row.freeInBucket > 0
                  ? ` · ₵${formatCurrency(row.freeInBucket)} free`
                  : ""}
            </Text>
          </>
        );
        return onBucketPress ? (
          <Pressable
            key={bucket}
            onPress={() => onBucketPress(bucket)}
            className="flex-row items-center justify-between active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={`Filter ${BUCKET_LABELS[bucket]} categories`}
          >
            {content}
          </Pressable>
        ) : (
          <View key={bucket} className="flex-row items-center justify-between">
            {content}
          </View>
        );
      })}

      <View className="border-t border-slate-700/60 pt-3 gap-1">
        <Text className="text-slate-400 text-sm">
          Planned ₵{formatCurrency(validation.totalPlanned)}
          {validation.unassigned > 0
            ? ` · Unassigned ₵${formatCurrency(validation.unassigned)}`
            : ""}
        </Text>
        <Text
          className="text-sm font-medium"
          style={{ color: overallOver || anyBucketOver ? "#F87171" : "#34D399" }}
        >
          {overallOver
            ? "Above take-home pay"
            : anyBucketOver
              ? "A bucket is over its budget"
              : "Within take-home pay"}
        </Text>
      </View>
    </View>
  );
}
