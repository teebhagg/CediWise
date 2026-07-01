import { AppDialog } from "@/components/AppDialog";
import type { AllocationExceededResult } from "@/utils/allocationExceeded";
import { AlertTriangle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  result: AllocationExceededResult | null;
  onClose: () => void;
  onConfirm: () => void;
  showFlexibleAck?: boolean;
  onTrimCategories?: () => void;
  onAdjustSplit?: () => void;
};

export function AllocationExceededModal({
  visible,
  result,
  onClose,
  onConfirm,
  showFlexibleAck = false,
  onTrimCategories,
  onAdjustSplit,
}: Props) {
  if (!result) return null;

  const allocationStr = result.suggestedAllocation
    ? `${Math.round(result.suggestedAllocation.needsPct * 100)}/${Math.round(result.suggestedAllocation.wantsPct * 100)}/${Math.round(result.suggestedAllocation.savingsPct * 100)}`
    : null;

  const handleConfirm = () => {
    onConfirm();
    if (!showFlexibleAck && !result.exceedsIncome) {
      onClose();
    }
  };

  const primaryLabel = showFlexibleAck
    ? "Save anyway"
    : result.exceedsBucket && !result.exceedsIncome
      ? "Save limit"
      : result.exceedsIncome
        ? "Continue"
        : "Apply & continue";

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
      title={
        result.exceedsIncome
          ? "Above take-home pay"
          : "Budget exceeds allocation"
      }
      description={result.message}
      primaryLabel={primaryLabel}
      onPrimary={handleConfirm}
      secondaryLabel="Cancel"
      onSecondary={onClose}
    >
      {result.exceedsIncome && (
        <View style={styles.debtBanner}>
          <Text style={styles.debtBannerText}>
            {showFlexibleAck
              ? "Your plan will stay above take-home. The summary will keep showing this until you adjust."
              : `If you spent every limit, you'd be ₵${result.debtAmount.toFixed(2)} short this month. Track actual overspend when it happens.`}
          </Text>
        </View>
      )}

      {result.warnings.length > 0 && (
        <View style={styles.warnings}>
          {result.warnings.map((w, i) => (
            <Text key={`w-${i}-${w.slice(0, 30)}`} style={styles.warningText}>
              • {w}
            </Text>
          ))}
        </View>
      )}

      {allocationStr ? (
        <Text style={styles.allocationText}>Updated allocation: {allocationStr}</Text>
      ) : null}

      {result.exceedsBucket && !result.exceedsIncome && !showFlexibleAck ? (
        <View style={styles.extraActions}>
          {onTrimCategories ? (
            <Pressable onPress={onTrimCategories} style={styles.extraAction}>
              <Text style={styles.extraActionText}>Trim other categories</Text>
            </Pressable>
          ) : null}
          {onAdjustSplit ? (
            <Pressable onPress={onAdjustSplit} style={styles.extraAction}>
              <Text style={styles.extraActionText}>Increase Needs %</Text>
            </Pressable>
          ) : null}
        </View>
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
  debtBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  debtBannerText: {
    fontSize: 14,
    color: "#FCA5A5",
    textAlign: "left",
    fontWeight: "600",
  },
  warnings: {
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: "#FCD34D",
    marginBottom: 4,
    lineHeight: 20,
  },
  allocationText: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 0,
  },
  extraActions: {
    marginTop: 12,
    gap: 8,
  },
  extraAction: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(51, 65, 85, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  extraActionText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
