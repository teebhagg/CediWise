import { AppDialog } from "@/components/AppDialog";
import type { AllocationExceededResult } from "@/utils/allocationExceeded";
import { AlertTriangle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  result: AllocationExceededResult | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function AllocationExceededModal({
  visible,
  result,
  onClose,
  onConfirm,
}: Props) {
  if (!result) return null;

  const allocationStr = result.suggestedAllocation
    ? `${Math.round(result.suggestedAllocation.needsPct * 100)}/${Math.round(result.suggestedAllocation.wantsPct * 100)}/${Math.round(result.suggestedAllocation.savingsPct * 100)}`
    : null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

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
      title="Budget exceeds allocation"
      description={result.message}
      primaryLabel="Apply & continue"
      onPrimary={handleConfirm}
      secondaryLabel="Cancel"
      onSecondary={onClose}
    >
      {result.exceedsIncome && (
        <View style={styles.debtBanner}>
          <Text style={styles.debtBannerText}>
            This will exceed your income. If you spend this much, you will overspend by GHS{" "}
            {result.debtAmount.toFixed(2)}. Track any actual overspend in Debt when it happens.
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
});
