import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { AlertTriangle, Banknote, PiggyBank, X } from "lucide-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";

import { GlassView } from "@/components/GlassView";
import type { CycleDeficitResolutionChoice } from "@/utils/cycleDeficit";
import { formatCurrency } from "@/utils/formatCurrency";

type Props = {
  visible: boolean;
  deficitAmount: number;
  cycleLabel: string;
  onClose: () => void;
  onResolve: (choice: CycleDeficitResolutionChoice) => void;
};

export function DeficitResolutionModal({
  visible,
  deficitAmount,
  cycleLabel,
  onClose,
  onResolve,
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

  const handleChoice = async (choice: CycleDeficitResolutionChoice) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onResolve(choice);
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/65" />
        {Platform.OS === "ios" && (
          <GlassView
            intensity={7}
            tint="dark"
            className="absolute inset-0"
            onTouchEnd={handleClose}
          />
        )}
        <Dialog.Content
          className="max-w-[360px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
        >
          <Dialog.Close
            variant="ghost"
            className="absolute top-4 right-4 w-10 h-10 rounded-full z-10 bg-slate-600/60 border border-slate-500/50"
            iconProps={{ size: 20, color: "#e2e8f0" }}
            onPress={handleClose}
          />
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: "rgba(251, 191, 36, 0.2)" }]}>
                <AlertTriangle size={22} color="#fbbf24" />
              </View>
              <Text numberOfLines={2} style={styles.title}>
                Overspend last cycle
              </Text>
            </View>
            <Text style={styles.description}>
              You spent {formatCurrency(deficitAmount)} more than your income for{" "}
              {cycleLabel}. How did you cover it?
            </Text>

            <View style={styles.options}>
              <Button
                variant="outline"
                onPress={() => handleChoice("financed")}
                className="h-12 rounded-xl border-slate-600"
                style={styles.optionButton}
              >
                <Banknote size={20} color="#94A3B8" />
                <Text style={styles.optionText}>Financed (add to Debt)</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => handleChoice("covered_by_savings")}
                className="h-12 rounded-xl border-slate-600"
                style={styles.optionButton}
              >
                <PiggyBank size={20} color="#94A3B8" />
                <Text style={styles.optionText}>Covered by savings</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => handleChoice("dismissed")}
                className="h-12 rounded-xl"
                style={styles.optionButton}
              >
                <X size={20} color="#64748B" />
                <Text style={styles.optionTextSecondary}>Dismiss</Text>
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
    paddingTop: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F1F5F9",
    flex: 1,
    textAlign: "left",
  },
  description: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "left",
    lineHeight: 22,
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  optionTextSecondary: {
    fontSize: 15,
    color: "#64748B",
  },
});
