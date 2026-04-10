import * as Haptics from "expo-haptics";
import { CreditCard } from 'lucide-react-native';
import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
 Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDialog } from './AppDialog';
import { AppTextField } from "./AppTextField";

export type AddDebtSubmitPayload = {
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate?: number | null;
  sourceCycleId?: string | null;
};

export type AddDebtInitialValues = {
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: AddDebtSubmitPayload) => void;
  /** Pre-fill form (e.g. from deficit "Financed" flow) */
  initialValues?: AddDebtInitialValues | null;
  /** Cycle where overspend occurred (deficit flow) */
  sourceCycleId?: string | null;
};

export function AddDebtModal({
  visible,
  onClose,
  onSubmit,
  initialValues,
  sourceCycleId,
}: Props) {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setError(undefined);
      if (initialValues) {
        setName(initialValues.name);
        setTotalAmount(String(initialValues.totalAmount));
        setRemainingAmount(String(initialValues.remainingAmount));
        setMonthlyPayment(String(initialValues.monthlyPayment));
      } else {
        setName("");
        setTotalAmount("");
        setRemainingAmount("");
        setMonthlyPayment("");
      }
      setInterestRate("");
    }
  }, [visible, initialValues]);

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
      sourceCycleId: sourceCycleId ?? undefined,
    });
    onClose();
  };

  const insets = useSafeAreaInsets();

  return (
    <AppDialog
      visible={visible}
      onOpenChange={handleOpenChange}
      icon={<CreditCard size={22} color="#10B981" />}
      title="Add Debt"
      description="Loans, credit cards, or other debts"
      primaryLabel="Add"
      onPrimary={handleSubmit}
      onClose={handleClose}
    >
      <View className="gap-3">
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
      </View>
    </AppDialog>
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
