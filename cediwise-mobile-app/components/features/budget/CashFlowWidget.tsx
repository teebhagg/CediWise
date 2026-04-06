import * as Haptics from "expo-haptics";
import { usePostHog } from "posthog-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ChevronRight,
  Lock,
  Pencil,
  RefreshCw,
  TrendingDown,
  Wallet,
} from "lucide-react-native";

import { Card } from "@/components/Card";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useRecurringExpensesStore } from "@/stores/recurringExpensesStore";
import type { BudgetTransaction } from "@/types/budget";
import {
  computeCashFlowProjection,
  isDataStale,
} from "@/utils/cashFlow";
import { formatCurrency } from "@/utils/formatCurrency";
import { CashFlowSetupModal } from "./CashFlowSetupModal";
import { SalaryResetModal } from "./SalaryResetModal";

const EMERALD = "#10B981";

/** Shown under the title so new users understand the widget before numbers. */
const WIDGET_SUBTITLE =
  "Today's safe spend from your balance and activity. See more for run-out date and daily burn.";

type Props = {
  visible: boolean;
  canAccessBudget: boolean;
  paydayDay?: number | null;
  prefillSalary?: number | null;
  cycleTransactions: BudgetTransaction[];
  cycleStartDate?: string | null;
  onUpgradePress?: () => void;
};

export function CashFlowWidget({
  visible,
  canAccessBudget,
  paydayDay,
  prefillSalary,
  cycleTransactions,
  cycleStartDate,
  onUpgradePress,
}: Props) {
  const router = useRouter();
  const posthog = usePostHog();

  const openCashFlowDetail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((e) => {
      // Haptics may fail on simulators or unsupported devices
      if (__DEV__) console.debug("Haptics failed:", e);
    });
    router.push("/budget/cash-flow");
  };
  const { balance, monthlyIncome, lastReset, isSetup, isLoading } =
    useCashFlowStore();
  const { recurringExpenses } = useRecurringExpensesStore();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const analyticsLoggedRef = useRef(false);

  const dataStale = isDataStale(lastReset);

  const projection = useMemo(() => {
    if (!isSetup || balance == null || !cycleStartDate) return null;
    return computeCashFlowProjection(
      balance,
      cycleTransactions.map((t) => ({
        amount: t.amount,
        occurredAt: t.occurredAt,
      })),
      recurringExpenses.map((e) => ({
        amount: e.amount,
        frequency: e.frequency,
        isActive: e.isActive,
      })),
      cycleStartDate
    );
  }, [balance, cycleTransactions, recurringExpenses, cycleStartDate, isSetup]);

  // PostHog: fire cash_flow_viewed once when projection is available
  useEffect(() => {
    if (!projection || analyticsLoggedRef.current) return;
    analyticsLoggedRef.current = true;
    posthog?.capture("cash_flow_viewed", {
      days_to_runout: projection.daysUntilRunOut ?? -1,
      has_safe_to_spend: !projection.isNegative,
    });
  }, [projection, posthog]);

  if (!visible) return null;

  // ── Free tier gate ──────────────────────────────────────────────────────────
  if (!canAccessBudget) {
    return (
      <Card className="border border-slate-700/50">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-500/15 items-center justify-center">
            <Wallet size={20} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-base">
              Survive the Month
            </Text>
            <Text className="text-slate-400 text-xs mt-1 leading-[18px]">
              {WIDGET_SUBTITLE}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Lock size={14} color="#6B7280" />
          </View>
        </View>
        {onUpgradePress && (
          <Pressable
            onPress={onUpgradePress}
            className="mt-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center active:bg-emerald-500/20">
            <Text className="text-emerald-400 font-semibold text-sm">
              Upgrade to Smart Budget
            </Text>
          </Pressable>
        )}
      </Card>
    );
  }

  // ── Stale data prompt ───────────────────────────────────────────────────────
  if (dataStale && isSetup) {
    return (
      <>
        <Card className="border border-amber-500/30">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-amber-500/15 items-center justify-center">
              <RefreshCw size={18} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">
                Cash flow data is stale
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                {"Your cash flow hasn't been reset in 2+ months"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowResetModal(true)}
            className="mt-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 items-center active:bg-amber-500/20">
            <Text className="text-amber-400 font-semibold text-sm">
              Reset now
            </Text>
          </Pressable>
        </Card>
        <SalaryResetModal
          visible={showResetModal}
          onClose={() => setShowResetModal(false)}
          currentMonthlyIncome={monthlyIncome}
        />
      </>
    );
  }

  // ── Not set up yet ──────────────────────────────────────────────────────────
  if (!isSetup && !isLoading) {
    return (
      <>
        <Card className="border border-emerald-500/20">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-500/15 items-center justify-center">
              <Wallet size={20} color="#10B981" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-white font-semibold text-base">
                  Survive the Month
                </Text>
                <View className="bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    New
                  </Text>
                </View>
              </View>
              <Text className="text-slate-400 text-xs mt-0.5 leading-4">
                {WIDGET_SUBTITLE}
              </Text>
            </View>
          </View>
          <Text className="text-slate-400 text-sm leading-5 mb-3">
            Add your current balance to unlock safe-to-spend and remaining on
            this card. Run-out date and burn rate stay on the full cash flow
            screen.
          </Text>
          <Pressable
            onPress={() => setShowSetupModal(true)}
            className="py-3 rounded-xl bg-emerald-500 active:bg-emerald-600 items-center">
            <Text className="text-slate-900 font-bold text-sm">
              Set up in under a minute
            </Text>
          </Pressable>
        </Card>

        <CashFlowSetupModal
          visible={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          prefillSalary={prefillSalary}
          prefillPaydayDay={paydayDay}
        />
      </>
    );
  }

  // ── Data insufficient (< 3 days of transactions) ───────────────────────────
  if (projection?.sufficiency === "insufficient") {
    return (
      <>
        <Card className="border border-slate-700/50">
          <View className="flex-row items-start justify-between gap-2 mb-2">
            <View className="flex-row items-start gap-2 flex-1 pr-2">
              <View className="w-9 h-9 rounded-lg bg-slate-700/50 items-center justify-center mt-0.5">
                <TrendingDown size={16} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  Survive the Month
                </Text>
                <Text className="text-slate-400 text-xs mt-1 leading-[18px]">
                  {WIDGET_SUBTITLE}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowResetModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Update cash balance"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="w-11 h-11 items-center justify-center rounded-lg bg-slate-700/50 active:bg-slate-700">
              <Pencil size={18} color={EMERALD} />
            </Pressable>
          </View>

          <View className="rounded-[18px] p-2.5 flex-row bg-slate-800/40">
            <View className="flex-1 pr-2">
              <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
                Safe today
              </Text>
              <Text className="text-slate-500 text-sm font-semibold leading-tight">
                Add expenses
              </Text>
              <Text className="text-slate-600 text-[10px] mt-0.5 leading-3.5">
                Needs a few days of data
              </Text>
            </View>
            <View className="w-px bg-slate-700/80 self-stretch my-0.5" />
            <View className="flex-1 pl-2">
              <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
                Remaining
              </Text>
              <Text className="text-white text-lg font-bold leading-tight">
                GHS {formatCurrency(balance ?? 0)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openCashFlowDetail}
            className="mt-2 flex-row items-center justify-center gap-1 py-2 active:opacity-70">
            <Text className="text-emerald-400 text-xs font-semibold">
              See more
            </Text>
            <ChevronRight size={14} color="#34D399" />
          </Pressable>
        </Card>

        <SalaryResetModal
          visible={showResetModal}
          onClose={() => setShowResetModal(false)}
          currentMonthlyIncome={monthlyIncome}
        />
      </>
    );
  }

  // ── No burn rate (zero spending) or missing projection ─────────────────────
  if (!projection || projection.dailyBurnRate === 0) {
    const safeIsReady =
      projection != null && projection.dailyBurnRate === 0;
    return (
      <>
        <Card className="border border-slate-700/50">
          <View className="flex-row items-start justify-between gap-2 mb-2">
            <View className="flex-row items-start gap-2 flex-1 pr-2">
              <View className="w-9 h-9 rounded-lg bg-slate-700/50 items-center justify-center mt-0.5">
                <Wallet size={16} color="#94A3B8" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  Survive the Month
                </Text>
                <Text className="text-slate-400 text-xs mt-1 leading-[18px]">
                  {WIDGET_SUBTITLE}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowResetModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Update cash balance"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="w-11 h-11 items-center justify-center rounded-lg bg-slate-700/50 active:bg-slate-700">
              <Pencil size={18} color={EMERALD} />
            </Pressable>
          </View>

          <View className="rounded-[18px] p-2.5 flex-row bg-slate-800/40">
            <View className="flex-1 pr-2">
              <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
                Safe today
              </Text>
              {safeIsReady ? (
                <Text className="text-white text-lg font-bold leading-tight">
                  GHS {formatCurrency(projection.safeToSpendToday)}
                </Text>
              ) : (
                <>
                  <Text className="text-slate-500 text-sm font-semibold leading-tight">
                    Log spending
                  </Text>
                  <Text className="text-slate-600 text-[10px] mt-0.5 leading-3.5">
                    To estimate a daily amount
                  </Text>
                </>
              )}
            </View>
            <View className="w-px bg-slate-700/80 self-stretch my-0.5" />
            <View className="flex-1 pl-2">
              <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
                Remaining
              </Text>
              <Text className="text-white text-lg font-bold leading-tight">
                GHS {formatCurrency(balance ?? 0)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={openCashFlowDetail}
            className="mt-2 flex-row items-center justify-center gap-1 py-2 active:opacity-70">
            <Text className="text-emerald-400 text-xs font-semibold">
              See more
            </Text>
            <ChevronRight size={14} color="#34D399" />
          </Pressable>
        </Card>

        <SalaryResetModal
          visible={showResetModal}
          onClose={() => setShowResetModal(false)}
          currentMonthlyIncome={monthlyIncome}
        />
      </>
    );
  }

  // ── Full / warmup projection (budget card: safe + remaining only) ────────────
  const cardBorderClass = projection.isNegative
    ? "border-red-500/40"
    : "border-emerald-500/20";

  return (
    <>
      <Card className={`border ${cardBorderClass}`}>
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <View className="flex-row items-start gap-2 flex-1 pr-2">
            <View
              className={`w-9 h-9 rounded-lg items-center justify-center mt-0.5 ${
                projection.isNegative ? "bg-red-500/15" : "bg-emerald-500/15"
              }`}>
              <TrendingDown
                size={16}
                color={projection.isNegative ? "#F87171" : EMERALD}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                Survive the Month
              </Text>
              <Text className="text-slate-400 text-xs mt-1 leading-[18px]">
                {WIDGET_SUBTITLE}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowResetModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Update cash balance"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            className="w-11 h-11 items-center justify-center rounded-lg bg-slate-700/50 active:bg-slate-700">
            <Pencil size={18} color={EMERALD} />
          </Pressable>
        </View>

        <View
          className={`rounded-[18px] p-2.5 flex-row ${
            projection.isNegative ? "bg-red-500/10" : "bg-slate-800/40"
          }`}>
          <View className="flex-1 pr-2">
            <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
              Safe today
            </Text>
            {projection.isNegative ? (
              <View>
                <Text className="text-red-400 text-lg font-bold leading-tight">
                  Over limit
                </Text>
                <Text className="text-red-400/65 text-[10px] mt-0.5 leading-3.5">
                  Past safe spend for the month
                </Text>
              </View>
            ) : (
              <Text className="text-white text-lg font-bold leading-tight">
                GHS {formatCurrency(projection.safeToSpendToday)}
              </Text>
            )}
          </View>
          <View className="w-px bg-slate-700/80 self-stretch my-0.5" />
          <View className="flex-1 pl-2">
            <Text className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-0.5">
              Remaining
            </Text>
            <Text className="text-white text-lg font-bold leading-tight">
              GHS {formatCurrency(balance ?? 0)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openCashFlowDetail}
          className="mt-2 flex-row items-center justify-center gap-1 py-2 active:opacity-70">
          <Text className="text-emerald-400 text-xs font-semibold">
            See more
          </Text>
          <ChevronRight size={14} color="#34D399" />
        </Pressable>
      </Card>

      <SalaryResetModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        currentMonthlyIncome={monthlyIncome}
      />

      {/* <CashFlowSetupModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        prefillSalary={prefillSalary}
        prefillPaydayDay={paydayDay}
      /> */}
    </>
  );
}
