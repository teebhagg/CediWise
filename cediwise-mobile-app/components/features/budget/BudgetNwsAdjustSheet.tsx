import { AppDialog } from "@/components/AppDialog";
import type { NwsAdjustPreview } from "@/utils/budgetNwsAdjust";
import { formatCurrency } from "@/utils/formatCurrency";
import { SlidersHorizontal } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";

type Props = {
  visible: boolean;
  preview: NwsAdjustPreview | null;
  onClose: () => void;
  onApply: (needsPct: number, wantsPct: number, savingsPct: number) => void;
};

function pctLabel(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function BudgetNwsAdjustSheet({
  visible,
  preview,
  onClose,
  onApply,
}: Props) {
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);

  useEffect(() => {
    if (!preview) return;
    setNeedsPct(Math.round(preview.current.needsPct * 100));
    setWantsPct(Math.round(preview.current.wantsPct * 100));
  }, [preview, visible]);

  const savingsPct = Math.max(0, 100 - needsPct - wantsPct);

  const handleApply = useCallback(() => {
    const total = needsPct + wantsPct + savingsPct;
    if (total <= 0) return;
    onApply(needsPct / total, wantsPct / total, savingsPct / total);
  }, [needsPct, wantsPct, savingsPct, onApply]);

  if (!preview) return null;

  const proposedEnvelopes = {
    needs: preview.takeHome * (needsPct / 100),
    wants: preview.takeHome * (wantsPct / 100),
    savings: preview.takeHome * (savingsPct / 100),
  };

  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={
        <View style={styles.iconWrap}>
          <SlidersHorizontal color="#34D399" size={22} />
        </View>
      }
      title="Adjust Needs / Wants / Savings"
      description="Shift your monthly split. Category limits will be recalculated when you apply."
      primaryLabel="Apply split"
      onPrimary={handleApply}
      secondaryLabel="Cancel"
      onSecondary={onClose}
      primaryDisabled={savingsPct < 0}
    >
      <View style={styles.row}>
        <Text style={styles.label}>Needs</Text>
        <Text style={styles.value}>{pctLabel(needsPct / 100)}</Text>
      </View>
      <Slider
        minimumValue={10}
        maximumValue={80}
        step={1}
        value={needsPct}
        onValueChange={setNeedsPct}
        minimumTrackTintColor="#34D399"
        maximumTrackTintColor="#334155"
        thumbTintColor="#34D399"
      />

      <View style={styles.row}>
        <Text style={styles.label}>Wants</Text>
        <Text style={styles.value}>{pctLabel(wantsPct / 100)}</Text>
      </View>
      <Slider
        minimumValue={5}
        maximumValue={60}
        step={1}
        value={wantsPct}
        onValueChange={setWantsPct}
        minimumTrackTintColor="#60A5FA"
        maximumTrackTintColor="#334155"
        thumbTintColor="#60A5FA"
      />

      <View style={styles.row}>
        <Text style={styles.label}>Savings</Text>
        <Text style={styles.value}>{pctLabel(savingsPct / 100)}</Text>
      </View>

      <View style={styles.envelopeBox}>
        <Text style={styles.envelopeTitle}>New monthly envelopes</Text>
        <Text style={styles.envelopeLine}>
          Needs ₵{formatCurrency(proposedEnvelopes.needs)} · Wants ₵
          {formatCurrency(proposedEnvelopes.wants)} · Savings ₵
          {formatCurrency(proposedEnvelopes.savings)}
        </Text>
        <Text style={styles.envelopeHint}>
          Current: {pctLabel(preview.current.needsPct)} /{" "}
          {pctLabel(preview.current.wantsPct)} /{" "}
          {pctLabel(preview.current.savingsPct)}
        </Text>
      </View>

      {savingsPct < 0 ? (
        <Text style={styles.error}>Needs + Wants cannot exceed 100%.</Text>
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
    backgroundColor: "rgba(52, 211, 153, 0.15)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    marginTop: 8,
  },
  label: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  value: { color: "#94A3B8", fontSize: 14 },
  envelopeBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  envelopeTitle: {
    color: "#94A3B8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  envelopeLine: { color: "#E2E8F0", fontSize: 14, lineHeight: 20 },
  envelopeHint: { color: "#64748B", fontSize: 12, marginTop: 6 },
  error: { color: "#F87171", fontSize: 13, marginTop: 8 },
});
