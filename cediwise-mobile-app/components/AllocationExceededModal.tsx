import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { AlertTriangle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { GlassView } from "@/components/GlassView";
import type { AllocationExceededResult } from "../utils/allocationExceeded";

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
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    onClose();
  };

  const handleConfirm = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onConfirm();
    onClose();
  };

  if (!result) return null;

  const allocationStr = result.suggestedAllocation
    ? `${Math.round(result.suggestedAllocation.needsPct * 100)}/${Math.round(result.suggestedAllocation.wantsPct * 100)}/${Math.round(result.suggestedAllocation.savingsPct * 100)}`
    : null;

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <Dialog.Content
          className="max-w-[360px] w-full rounded-xl overflow-hidden bg-slate-900/95 p-0"
        >
          <Dialog.Close
            variant="ghost"
            className="absolute top-4 right-4 p-1 z-10"
            onPress={handleClose}
          />
          <View style={styles.content}>
            <View style={styles.iconRow}>
              <AlertTriangle color="#F59E0B" size={28} />
            </View>
            <Dialog.Title className="text-[20px] font-bold text-slate-100 text-center mb-2">
              Budget exceeds allocation
            </Dialog.Title>
            <Dialog.Description className="text-[15px] text-slate-400 text-center mb-4 leading-[22px]">
              {result.message}
            </Dialog.Description>

            {result.exceedsIncome && (
              <View style={styles.debtBanner}>
                <Text style={styles.debtBannerText}>
                  Debt will occur. Excess (GHS {result.debtAmount.toFixed(2)}) will be added to debts
                  to be paid next cycle.
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

            {allocationStr && (
              <Text style={styles.allocationText}>Updated allocation: {allocationStr}</Text>
            )}

            <View style={styles.actions}>
              <Button
                variant="primary"
                onPress={handleConfirm}
                className="h-12 rounded-full bg-emerald-500"
              >
                <Button.Label className="text-slate-900 font-semibold">
                  Apply & continue
                </Button.Label>
              </Button>
              <Button variant="ghost" size="md" onPress={handleClose}>
                <Button.Label className="text-slate-400">Cancel</Button.Label>
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    // paddingTop: 32,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  debtBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  debtBannerText: {
    fontSize: 14,
    color: "#FCA5A5",
    textAlign: "center",
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
    textAlign: "center",
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
});
