import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GlassView } from "@/components/GlassView";
import type { BudgetBucket, RecurringExpenseFrequency } from "@/types/budget";
import { ScrollView } from "react-native";
import { AppTextField } from "./AppTextField";

const FREQUENCIES: { value: RecurringExpenseFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const BUCKETS: { value: BudgetBucket; label: string }[] = [
  { value: "needs", label: "Needs" },
  { value: "wants", label: "Wants" },
  { value: "savings", label: "Savings" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    amount: number;
    frequency: RecurringExpenseFrequency;
    bucket: BudgetBucket;
    autoAllocate?: boolean;
  }) => void;
};

export function AddRecurringExpenseModal({
  visible,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringExpenseFrequency>("monthly");
  const [bucket, setBucket] = useState<BudgetBucket>("wants");
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setError(undefined);
      setName("");
      setAmount("");
      setFrequency("monthly");
      setBucket("wants");
      setAutoAllocate(true);
    }
  }, [visible]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = () => {
    Haptics.selectionAsync().catch(() => { });
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    const parsed = parseFloat(String(amount).replace(/,/g, ""));
    if (!trimmed) {
      setError("Enter a name");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    onSubmit({
      name: trimmed,
      amount: parsed,
      frequency,
      bucket,
      autoAllocate,
    });
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1, justifyContent: "center" }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 40}
        >
          <Dialog.Content
            className="max-w-[380px] w-full rounded-xl overflow-hidden bg-slate-900/95 p-0"
            style={styles.contentShadow}
          >
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
              onPress={handleClose}
            />
            <View style={styles.content}>
              <Dialog.Title className="text-[26px] font-bold text-slate-200 text-center mb-1.5">
                Add Recurring Expense
              </Dialog.Title>
              <Dialog.Description className="text-[15px] text-slate-400 text-center mb-3 leading-[22px]">
                Subscriptions, memberships, or regular payments
              </Dialog.Description>

              <ScrollView >
                <View className="gap-3">
                  <View style={styles.field}>
                    <AppTextField
                      label="Name"
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Netflix, Gym"
                    />
                  </View>

                  <View style={styles.field}>
                    <AppTextField
                      label="Amount (GHS)"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Frequency</Text>
                    <View style={styles.rowWrap}>
                      {FREQUENCIES.map((f) => (
                        <Pressable
                          key={f.value}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            setFrequency(f.value);
                          }}
                          style={[styles.chip, frequency === f.value && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, frequency === f.value && styles.chipTextActive]}>
                            {f.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Bucket</Text>
                    <View style={styles.row}>
                      {BUCKETS.map((b) => (
                        <Pressable
                          key={b.value}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => { });
                            setBucket(b.value);
                          }}
                          style={[styles.chip, bucket === b.value && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, bucket === b.value && styles.chipTextActive]}>
                            {b.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => { });
                      setAutoAllocate((v) => !v);
                    }}
                    style={styles.toggleRow}
                  >
                    <Text style={styles.toggleLabel}>Auto-allocate each cycle</Text>
                    <View style={[styles.toggle, autoAllocate && styles.toggleOn]}>
                      <View style={[styles.toggleThumb, autoAllocate && styles.toggleThumbOn]} />
                    </View>
                  </Pressable>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <Button variant="primary" onPress={handleSubmit} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                    <Button.Label className="text-slate-900 font-semibold">Add</Button.Label>
                  </Button>
                </View>
              </ScrollView>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  contentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOpacity: 0.35,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 18 },
    }),
  },
  scrollContainer: {
    flex: 1,
    height: 300,
    overflowY: "auto",
  },
  content: {
    padding: 24,
    paddingTop: 50,
    gap: 12,
    flexGrow: 1,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    color: "#94A3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: 10 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  chipActive: {
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    borderColor: "rgba(34, 197, 94, 0.45)",
  },
  chipText: {
    fontSize: 13,
    color: "#CBD5F5",
  },
  chipTextActive: { color: "#F8FAFC" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#E2E8F0",
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleOn: { backgroundColor: "rgba(34, 197, 94, 0.5)" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#94A3B8",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
