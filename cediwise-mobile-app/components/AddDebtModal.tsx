import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BlurView } from "expo-blur";
import { AppTextField } from "./AppTextField";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    totalAmount: number;
    remainingAmount: number;
    monthlyPayment: number;
    interestRate?: number | null;
  }) => void;
};

export function AddDebtModal({ visible, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setError(undefined);
      setName("");
      setTotalAmount("");
      setRemainingAmount("");
      setMonthlyPayment("");
      setInterestRate("");
    }
  }, [visible]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = () => {
    Haptics.selectionAsync().catch(() => { });
    onClose();
  };

  const parseNum = (v: string) => parseFloat(String(v).replace(/,/g, "")) || 0;

  const handleSubmit = () => {
    const trimmed = name.trim();
    const total = parseNum(totalAmount);
    const remaining = parseNum(remainingAmount);
    const payment = parseNum(monthlyPayment);
    const rate = interestRate.trim() ? parseNum(interestRate) : null;

    if (!trimmed) {
      setError("Enter a name");
      return;
    }
    if (total <= 0) {
      setError("Enter total debt amount");
      return;
    }
    if (remaining <= 0 || remaining > total) {
      setError("Remaining amount must be between 0 and total");
      return;
    }
    if (payment <= 0) {
      setError("Enter monthly payment");
      return;
    }
    if (rate !== null && (rate < 0 || rate > 100)) {
      setError("Interest rate must be 0–100");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    onSubmit({
      name: trimmed,
      totalAmount: total,
      remainingAmount: remaining,
      monthlyPayment: payment,
      interestRate: rate ?? undefined,
    });
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <BlurView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
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
                Add Debt
              </Dialog.Title>
              <Dialog.Description className="text-[15px] text-slate-400 text-center mb-3 leading-[22px]">
                Loans, credit cards, or other debts
              </Dialog.Description>

              <View style={styles.field}>
                <AppTextField
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Student Loan, Credit Card"
                />
              </View>

              <View style={styles.field}>
                <AppTextField
                  label="Total Amount (GHS)"
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>

              <View style={styles.field}>
                <AppTextField
                  label="Remaining Balance (GHS)"
                  value={remainingAmount}
                  onChangeText={setRemainingAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>

              <View style={styles.field}>
                <AppTextField
                  label="Monthly Payment (GHS)"
                  value={monthlyPayment}
                  onChangeText={setMonthlyPayment}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>

              <View style={styles.field}>
                <AppTextField
                  label="Interest Rate % (optional)"
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 12"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button variant="primary" onPress={handleSubmit} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                <Button.Label className="text-slate-900 font-semibold">Add</Button.Label>
              </Button>
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
  content: {
    padding: 24,
    paddingTop: 50,
    gap: 12,
  },
  field: { gap: 6 },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
