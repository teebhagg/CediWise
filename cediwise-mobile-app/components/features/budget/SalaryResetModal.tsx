import { AppTextField } from "@/components/AppTextField";
import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  currentMonthlyIncome: number | null;
};

export function SalaryResetModal({
  visible,
  onClose,
  currentMonthlyIncome,
}: Props) {
  const posthog = usePostHog();
  const { updateBalance } = useCashFlowStore();

  const prefillAmount = currentMonthlyIncome
    ? String(Math.round(currentMonthlyIncome))
    : "";

  const [balance, setBalance] = useState(prefillAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balanceInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => balanceInputRef.current?.focus(), 400);
    return () => clearTimeout(id);
  }, [visible]);

  const parsedBalance = parseFloat(balance.replace(/,/g, ""));
  const isValid = !isNaN(parsedBalance) && parsedBalance >= 0;

  async function handleReset() {
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await updateBalance(parsedBalance);

      posthog?.capture("cash_flow_salary_reset", {
        has_balance: parsedBalance > 0,
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reset failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CustomBottomSheet
      title="Salary day!"
      description="Did your salary arrive? Confirm your new balance to reset your month."
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <Text className="text-2xl mb-2">🎉</Text>

      <View className="mb-5">
        {currentMonthlyIncome != null && (
          <Text className="text-slate-500 text-xs mb-2">
            Expected salary: GHS {formatCurrency(currentMonthlyIncome)}
          </Text>
        )}
        <AppTextField
          ref={balanceInputRef}
          label="New balance (GHS)"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="Enter your current balance"
          returnKeyType="done"
          onSubmitEditing={handleReset}
        />
      </View>

      {error ? (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Pressable
          onPress={handleReset}
          disabled={!isValid || isSubmitting}
          className={`py-4 rounded-xl items-center justify-center flex-row gap-2 ${
            isValid && !isSubmitting
              ? "bg-emerald-500 active:bg-emerald-600"
              : "bg-slate-700"
          }`}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : null}
          <Text
            className={`font-bold text-base ${
              isValid && !isSubmitting ? "text-slate-900" : "text-slate-500"
            }`}>
            {isSubmitting ? "Resetting…" : "Reset my month"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="py-3 items-center active:opacity-70">
          <Text className="text-slate-500 text-sm">Not yet</Text>
        </Pressable>
      </View>
    </CustomBottomSheet>
  );
}
