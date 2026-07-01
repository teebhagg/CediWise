import { AppDialog } from "@/components/AppDialog";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import { formatViolationMessage } from "@/utils/budgetPlanValidation";
import { formatCurrency } from "@/utils/formatCurrency";
import { AlertTriangle } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "heroui-native";
import type { RebalancePreview } from "@/utils/budgetRebalance";
import { formatRebalancePreviewRowLabel } from "@/utils/budgetRebalance";

type Props = {
  visible: boolean;
  validation: BudgetPlanValidationResult | null;
  rebalancePreview: RebalancePreview | null;
  rebalanceLoading?: boolean;
  enforcement: "strict" | "flexible";
  onBalanceForMe: () => void | Promise<void>;
  onAdjustMyself: () => void;
  onApplyRebalance: () => void;
  onDismiss: () => void;
  onClose: () => void;
  onBackFromPreview?: () => void;
  showRebalancePreview: boolean;
  onAdjustSplit?: () => void;
  offendingBucket?: "needs" | "wants" | "savings" | null;
};

export function BudgetReconcileSheet({
  visible,
  validation,
  rebalancePreview,
  rebalanceLoading = false,
  enforcement,
  onBalanceForMe,
  onAdjustMyself,
  onApplyRebalance,
  onDismiss,
  onClose,
  onBackFromPreview,
  showRebalancePreview,
  onAdjustSplit,
  offendingBucket,
}: Props) {
  if (!validation) return null;

  const message = formatViolationMessage(validation);
  const overflow =
    validation.violations.find((v) => v.type === "L3")?.amount ??
    validation.violations.find((v) => v.type === "L2")?.amount ??
    0;

  const bucketDetail =
    offendingBucket && validation.buckets[offendingBucket].overflow > 0
      ? `Mostly in ${offendingBucket === "needs" ? "Needs" : offendingBucket === "wants" ? "Wants" : "Savings"}: ₵${formatCurrency(validation.buckets[offendingBucket].allocated)} planned vs ₵${formatCurrency(validation.buckets[offendingBucket].envelope)} budget.`
      : null;

  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={
        <View style={styles.iconWrap}>
          <AlertTriangle color="#F59E0B" size={24} />
        </View>
      }
      title="Budget needs adjustment"
      description={message}
      loading={rebalanceLoading}
      primaryLabel={showRebalancePreview ? "Apply changes" : undefined}
      onPrimary={showRebalancePreview ? onApplyRebalance : undefined}
      secondaryLabel={showRebalancePreview ? "Back" : undefined}
      onSecondary={
        showRebalancePreview
          ? (onBackFromPreview ?? onClose)
          : undefined
      }
    >
      <Text style={styles.detail}>
        Your category limits total ₵{formatCurrency(validation.totalPlanned)} against
        take-home ₵{formatCurrency(validation.takeHome)}
        {overflow > 0 ? ` (${formatCurrency(overflow)} over).` : "."}
      </Text>

      {bucketDetail ? <Text style={styles.detail}>{bucketDetail}</Text> : null}

      {showRebalancePreview && rebalancePreview && rebalancePreview.rows.length > 0 ? (
        <>
          {rebalancePreview.note ? (
            <Text style={styles.note}>{rebalancePreview.note}</Text>
          ) : null}
          <ScrollView style={styles.previewScroll}>
            {rebalancePreview.rows.map((row) => (
              <View key={row.categoryId} style={styles.previewRow}>
                <Text style={styles.previewName}>{row.name}</Text>
                <Text
                  style={[
                    styles.previewAmount,
                    row.kind === "duplicate_removed" && styles.previewAmountDuplicate,
                    row.kind === "profile_removed" && styles.previewAmountRemoved,
                    row.kind === "deleted" && styles.previewAmountDeleted,
                  ]}
                >
                  {formatRebalancePreviewRowLabel(row)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {!showRebalancePreview ? (
        <View style={styles.actionStack}>
          <Button
            variant="primary"
            size="md"
            onPress={onBalanceForMe}
            isDisabled={rebalanceLoading}
            className="w-full h-12 rounded-xl bg-emerald-500"
          >
            {rebalanceLoading ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Button.Label className="font-semibold text-slate-950">
                Balance for me
              </Button.Label>
            )}
          </Button>

          {onAdjustSplit ? (
            <Button
              variant="ghost"
              size="md"
              onPress={onAdjustSplit}
              isDisabled={rebalanceLoading}
              className="w-full h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40"
            >
              <Button.Label className="font-semibold text-emerald-300">
                Adjust Needs / Wants / Savings
              </Button.Label>
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="md"
            onPress={onAdjustMyself}
            isDisabled={rebalanceLoading}
            className="w-full h-12 rounded-xl bg-slate-600/80 border-0"
          >
            <Button.Label className="text-white font-semibold">
              Adjust myself
            </Button.Label>
          </Button>
        </View>
      ) : null}

      {enforcement === "flexible" && !showRebalancePreview ? (
        <Pressable onPress={onDismiss} style={styles.dismissLink}>
          <Text style={styles.dismissText}>I know it&apos;s tight — dismiss for now</Text>
        </Pressable>
      ) : null}
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  detail: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 12,
    lineHeight: 20,
  },
  note: {
    fontSize: 13,
    color: "#A7F3D0",
    marginBottom: 10,
    lineHeight: 18,
  },
  previewScroll: {
    maxHeight: 180,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.25)",
  },
  previewName: {
    color: "#E2E8F0",
    fontSize: 14,
    flex: 1,
  },
  previewAmount: {
    color: "#FCD34D",
    fontSize: 13,
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "58%",
  },
  previewAmountDuplicate: {
    color: "#94A3B8",
  },
  previewAmountRemoved: {
    color: "#F87171",
  },
  previewAmountDeleted: {
    color: "#FB7185",
    fontWeight: "600",
  },
  actionStack: {
    gap: 12,
    marginTop: 4,
  },
  dismissLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  dismissText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
