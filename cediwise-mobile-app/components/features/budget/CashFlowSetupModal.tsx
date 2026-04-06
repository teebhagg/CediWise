import { AppTextField } from "@/components/AppTextField";
import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { formatCurrency } from "@/utils/formatCurrency";
import { Button } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  prefillSalary?: number | null;
  prefillPaydayDay?: number | null;
};

export function CashFlowSetupModal({
  visible,
  onClose,
  prefillSalary,
  prefillPaydayDay,
}: Props) {
  const posthog = usePostHog();
  const { setupCashFlow } = useCashFlowStore();

  const [balance, setBalance] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState(
    prefillSalary ? String(Math.round(prefillSalary)) : ""
  );
  const [paydayDay, setPaydayDay] = useState(
    prefillPaydayDay ? String(prefillPaydayDay) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBalance("");
      setMonthlyIncome(prefillSalary ? String(Math.round(prefillSalary)) : "");
      setPaydayDay(prefillPaydayDay ? String(prefillPaydayDay) : "");
      setError(null);
    }
  }, [visible, prefillSalary, prefillPaydayDay]);

  const parsedBalance = parseFloat(balance.replace(/,/g, ""));
  const parsedIncome = parseFloat(monthlyIncome.replace(/,/g, ""));
  const parsedPayday = parseInt(paydayDay, 10);

  const isValid =
    !isNaN(parsedBalance) &&
    parsedBalance >= 0 &&
    !isNaN(parsedIncome) &&
    parsedIncome > 0;

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const paydayDayValue =
        !isNaN(parsedPayday) && parsedPayday >= 1 && parsedPayday <= 31
          ? parsedPayday
          : undefined;

      await setupCashFlow({
        balance: parsedBalance,
        monthlyIncome: parsedIncome,
        paydayDay: paydayDayValue,
      });

      posthog?.capture("cash_flow_setup_completed", {
        salary_day: paydayDayValue ?? null,
        has_income: parsedIncome > 0,
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Setup failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CustomBottomSheet
      title="Set up Cash Flow"
      description="See exactly when your money runs out"
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <View className="mb-4">
        <Text className="text-slate-500 text-xs mb-2">
          {
            "What's in your account right now? Be as accurate as possible."
          }
        </Text>
        <AppTextField
          label="Current balance (GHS)"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="e.g. 2,500"
          returnKeyType="next"
        />
      </View>

      <View className="mb-4">
        <Text className="text-slate-500 text-xs mb-2">
          Your take-home pay after PAYE and SSNIT deductions.
        </Text>
        <AppTextField
          label="Net monthly salary (GHS)"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
          keyboardType="decimal-pad"
          placeholder="e.g. 3,800"
          returnKeyType="next"
        />
      </View>

      <View className="mb-5">
        <Text className="text-slate-500 text-xs mb-2">
          When do you usually get paid? We use this to remind you to reset your
          balance.
        </Text>
        <AppTextField
          label="Payday (day of month)"
          value={paydayDay}
          onChangeText={(v) => {
            const num = parseInt(v, 10);
            if (v === "" || (!isNaN(num) && num >= 1 && num <= 31)) {
              setPaydayDay(v);
            }
          }}
          keyboardType="number-pad"
          placeholder="e.g. 25"
          maxLength={2}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>

      {parsedBalance > 0 && parsedIncome > 0 && (
        <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
          <Text className="text-emerald-400 text-sm font-semibold mb-1">
            Starting balance
          </Text>
          <Text className="text-white text-2xl font-bold">
            GHS {formatCurrency(parsedBalance)}
          </Text>
          <Text className="text-slate-400 text-xs mt-1">
            Monthly income: GHS {formatCurrency(parsedIncome)}
          </Text>
        </View>
      )}

      {error ? (
        <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
          <Text className="text-red-400 text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Button
          onPress={handleSubmit}
          isDisabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : null}
          <Text
            className="text-slate-950 font-semibold">
            {isSubmitting ? "Setting up…" : "Start tracking"}
          </Text>
        </Button>

        <Button
          variant="secondary"
          onPress={onClose}
          className="py-3 items-center active:opacity-70">
          <Text className="text-white text-sm">Cancel</Text>
        </Button>
      </View>
    </CustomBottomSheet>
  );
}
