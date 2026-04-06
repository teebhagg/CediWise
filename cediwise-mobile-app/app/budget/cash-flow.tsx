import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import {
  DEFAULT_EXPANDED_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { useBudgetScreenState } from "@/components/features/budget/useBudgetScreenState";
import { CashFlowSetupModal } from "@/components/features/budget/CashFlowSetupModal";
import { SalaryResetModal } from "@/components/features/budget/SalaryResetModal";
import { useTierContext } from "@/contexts/TierContext";
import { useAuth } from "@/hooks/useAuth";
import { useCashFlowStore } from "@/stores/cashFlowStore";
import { useRecurringExpensesStore } from "@/stores/recurringExpensesStore";
import {
  computeCashFlowProjection,
  formatRunOutDate,
  isDataStale,
  needsSalaryReset,
  toMonthlyEquivalent,
} from "@/utils/cashFlow";
import { formatCurrency } from "@/utils/formatCurrency";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PartyPopper,
  Pencil,
  RefreshCw,
  TrendingDown,
  Wallet,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

export default function BudgetCashFlowScreen() {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canAccessBudget } = useTierContext();
  const { derived, budget, router, profileVitals } = useBudgetScreenState();
  const { balance, monthlyIncome, lastReset, isSetup, isLoading } =
    useCashFlowStore();
  const { recurringExpenses } = useRecurringExpensesStore();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const analyticsLoggedRef = useRef(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const paydayDay = budget.state?.prefs?.paydayDay ?? null;
  const cycleStartDate = derived.activeCycle?.startDate ?? null;
  const cycleTransactions = useMemo(
    () =>
      derived.activeCycleId
        ? (budget.state?.transactions ?? []).filter(
            (t) => t.cycleId === derived.activeCycleId
          )
        : [],
    [budget.state?.transactions, derived.activeCycleId]
  );

  const dataStale = isDataStale(lastReset);
  const showPaydayReset = needsSalaryReset(paydayDay, lastReset);

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

  const fixedMonthlyTotal = useMemo(
    () =>
      recurringExpenses
        .filter((e) => e.isActive)
        .reduce((sum, e) => sum + toMonthlyEquivalent(e), 0),
    [recurringExpenses]
  );

  useEffect(() => {
    if (!canAccessBudget) {
      router.replace("/(tabs)/budget");
    }
  }, [canAccessBudget, router]);

  useEffect(() => {
    if (!projection || analyticsLoggedRef.current) return;
    analyticsLoggedRef.current = true;
    posthog?.capture("cash_flow_detail_viewed", {
      days_to_runout: projection.daysUntilRunOut ?? -1,
      sufficiency: projection.sufficiency,
    });
  }, [posthog, projection]);

  if (!canAccessBudget) {
    return null;
  }

  const headerPad = DEFAULT_EXPANDED_HEIGHT + insets.top + 16;

  const runOutIsCritical =
    projection != null &&
    projection.daysUntilRunOut != null &&
    projection.daysUntilRunOut <= 7;
  const runOutDateLabel = projection?.runOutDate
    ? formatRunOutDate(projection.runOutDate)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Survive the Month"
        collapsedTitle="Cash flow"
        expandedHeight={150}
        leading={<BackButton />}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingHorizontal: 20,
          paddingTop: headerPad,
        }}>
        {!user?.id ? (
          <Text className="text-slate-400 text-center mt-8">
            Sign in to view cash flow.
          </Text>
        ) : dataStale && isSetup ? (
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
        ) : !isSetup && !isLoading ? (
          <Card className="border border-emerald-500/20">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-500/15 items-center justify-center">
                <Wallet size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  Set up Survive the Month
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {"Add your balance to see run-out projections"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowSetupModal(true)}
              className="py-3 rounded-xl bg-emerald-500 active:bg-emerald-600 items-center">
              <Text className="text-slate-900 font-bold text-sm">
                Find my run-out date
              </Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {showPaydayReset && (
              <Pressable
                onPress={() => setShowResetModal(true)}
                className="flex-row items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 mb-4 active:bg-emerald-500/20">
                <PartyPopper size={16} color="#34D399" />
                <View className="flex-1">
                  <Text className="text-emerald-400 font-medium text-sm">
                    Salary day — tap to reset balance
                  </Text>
                </View>
              </Pressable>
            )}

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-500 text-xs uppercase tracking-wide">
                Overview
              </Text>
              <Pressable
                onPress={() => setShowResetModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Update cash balance"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-11 h-11 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:opacity-80">
                <Pencil size={20} color="#10B981" />
              </Pressable>
            </View>

            <Card
              className={`border mb-4 ${
                runOutIsCritical ? "border-red-500/35" : "border-slate-700/50"
              }`}>
              <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                Remaining balance
              </Text>
              <Text className="text-white text-3xl font-bold">
                GHS {formatCurrency(balance ?? 0)}
              </Text>
              {monthlyIncome != null && monthlyIncome > 0 && (
                <Text className="text-slate-400 text-sm mt-2">
                  Monthly income (reference) GHS{" "}
                  {formatCurrency(monthlyIncome)}
                </Text>
              )}
            </Card>

            {projection?.sufficiency === "insufficient" ? (
              <Card className="border border-slate-700/50 mb-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <TrendingDown size={18} color="#94A3B8" />
                  <Text className="text-white font-semibold">
                    Not enough data yet
                  </Text>
                </View>
                <Text className="text-slate-400 text-sm leading-5">
                  Log expenses for at least three days in this cycle so we can
                  estimate daily burn and your run-out date.
                </Text>
              </Card>
            ) : !projection || projection.dailyBurnRate === 0 ? (
              <Card className="border border-slate-700/50 mb-4">
                <Text className="text-white font-semibold mb-2">
                  No spending signal
                </Text>
                <Text className="text-slate-400 text-sm leading-5">
                  Once you log variable spending (or add recurring costs),
                  we will show daily burn and when your balance may run out.
                </Text>
              </Card>
            ) : (
              <>
                {projection.sufficiency === "warmup" && (
                  <View className="mb-3 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/15">
                    <Text className="text-amber-400/95 text-sm">
                      {projection.dataDays} days of data — the projection
                      refines as you log more.
                    </Text>
                  </View>
                )}

                <Card
                  className={`border mb-4 ${
                    runOutIsCritical
                      ? "border-red-500/35"
                      : "border-emerald-500/20"
                  }`}>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                        Safe today
                      </Text>
                      {projection.isNegative ? (
                        <>
                          <Text className="text-red-400 text-2xl font-bold">
                            Over limit
                          </Text>
                          <Text className="text-red-400/70 text-xs mt-1">
                            Past safe spend for the month
                          </Text>
                        </>
                      ) : (
                        <Text className="text-white text-2xl font-bold">
                          GHS {formatCurrency(projection.safeToSpendToday)}
                        </Text>
                      )}
                    </View>
                    <View className="w-px bg-slate-700/60 self-stretch" />
                    <View className="flex-1">
                      <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                        Runs out
                      </Text>
                      {runOutDateLabel ? (
                        <>
                          <Text
                            className={`text-2xl font-bold ${
                              runOutIsCritical
                                ? "text-red-400"
                                : "text-white"
                            }`}>
                            {runOutDateLabel}
                          </Text>
                          {projection.daysUntilRunOut != null && (
                            <Text
                              className={`text-xs mt-1 ${
                                runOutIsCritical
                                  ? "text-red-400/85"
                                  : "text-slate-500"
                              }`}>
                              {projection.daysUntilRunOut === 0
                                ? "Under a day left"
                                : `${projection.daysUntilRunOut} day${
                                    projection.daysUntilRunOut === 1
                                      ? ""
                                      : "s"
                                  } left`}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text className="text-slate-500 text-sm">—</Text>
                      )}
                    </View>
                  </View>
                </Card>

                <Card className="border border-slate-700/50 mb-4">
                  <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-3">
                    Burn and recurring
                  </Text>
                  <View className="gap-3">
                    <View className="flex-row justify-between items-baseline">
                      <Text className="text-slate-400 text-sm">
                        Daily burn (est.)
                      </Text>
                      <Text className="text-white font-semibold">
                        GHS {formatCurrency(projection.dailyBurnRate, 0)}/day
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                      <Text className="text-slate-400 text-sm">
                        Recurring (monthly eq.)
                      </Text>
                      <Text className="text-white font-semibold">
                        GHS {formatCurrency(fixedMonthlyTotal)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                      <Text className="text-slate-400 text-sm">
                        Data window
                      </Text>
                      <Text className="text-white font-semibold">
                        {projection.dataDays} days
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                      <Text className="text-slate-400 text-sm">
                        Confidence
                      </Text>
                      <Text className="text-white font-semibold capitalize">
                        {projection.sufficiency === "full"
                          ? "High"
                          : projection.sufficiency === "warmup"
                            ? "Building"
                            : "—"}
                      </Text>
                    </View>
                  </View>
                </Card>

                {runOutIsCritical && projection.daysUntilRunOut != null && (
                  <Card className="border border-red-500/30 mb-4 bg-red-500/5">
                    <Text className="text-red-400/95 text-sm leading-5">
                      At this pace, cash may run out in{" "}
                      {projection.daysUntilRunOut === 0
                        ? "under a day"
                        : `${projection.daysUntilRunOut} day${
                            projection.daysUntilRunOut === 1 ? "" : "s"
                          }`}
                      . Consider trimming spend or updating your balance after
                      income.
                    </Text>
                  </Card>
                )}
              </>
            )}

            {paydayDay != null && (
              <Card className="border border-slate-700/50">
                <Text className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                  Payday
                </Text>
                <Text className="text-white text-base">
                  Day {paydayDay} of each month (from budget preferences)
                </Text>
              </Card>
            )}
          </>
        )}
      </Animated.ScrollView>

      <SalaryResetModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        currentMonthlyIncome={monthlyIncome}
      />
      <CashFlowSetupModal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        prefillSalary={profileVitals.vitals?.stable_salary ?? null}
        prefillPaydayDay={paydayDay}
      />
    </View>
  );
}
