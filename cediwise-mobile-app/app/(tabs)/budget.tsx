import {
  BudgetLoadingSkeleton,
  InlineSyncPill,
} from "@/components/BudgetLoading";
import { AddDebtModal } from "@/components/AddDebtModal";
import { CashFlowWidget } from "@/components/features/budget/CashFlowWidget";
import { Card } from "@/components/Card";
import { DeficitResolutionModal } from "@/components/DeficitResolutionModal";
import { RolloverAllocationModal } from "@/components/RolloverAllocationModal";
import { BudgetExpensesCard } from "@/components/features/budget/BudgetExpensesCard";
import { BudgetModals } from "@/components/features/budget/BudgetModals";
import { BudgetOverviewCard } from "@/components/features/budget/BudgetOverviewCard";
import { BudgetPendingSyncCard } from "@/components/features/budget/BudgetPendingSyncCard";
import { BudgetPersonalizationCard } from "@/components/features/budget/BudgetPersonalizationCard";
import { BudgetQuickActions } from "@/components/features/budget/BudgetQuickActions";
import { BudgetReallocationBanner } from "@/components/features/budget/BudgetReallocationBanner";
import { BudgetSetupCycleCard } from "@/components/features/budget/BudgetSetupCycleCard";
import { BudgetToolsCard } from "@/components/features/budget/BudgetToolsCard";
import { MigrationPrompt } from "@/components/features/budget/MigrationPrompt";
import { StartNewCycleCard } from "@/components/features/budget/StartNewCycleCard";
import { useBudgetScreenState } from "@/components/features/budget/useBudgetScreenState";
import { useTierContext } from "@/contexts/TierContext";
import { useTourContext } from "@/contexts/TourContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Settings, WifiOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { TourZone, useTour } from "react-native-lumen";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { BUDGET_TOUR_READY_TIMEOUT_MS } from "@/constants/tourTokens";
import { analytics } from "@/utils/analytics";
import { computeNextCycleFromPrevious } from "@/utils/nextCycle";
import {
  filterEffectiveRecurringExpenses,
  toMonthlyEquivalentAmount,
} from "@/utils/recurringHelpers";

export default function BudgetScreen() {
  const router = useRouter();
  const {
    user,
    personalization,
    profileVitals,
    budget,
    refreshing,
    onRefresh,
    form,
    derived,
    ui,
    modals,
  } = useBudgetScreenState();
  const { recurringExpenses } = useRecurringExpenses();

  const nextCycleDate = useMemo(() => {
    const previewStart = ui.pendingRollover?.nextCycleStart;
    if (previewStart) {
      const [y, m, d] = previewStart.split("-").map((n) => parseInt(n, 10));
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const ac = derived.activeCycle;
    if (!ac) return new Date();
    const durationDays =
      Math.round(
        (new Date(ac.endDate).getTime() - new Date(ac.startDate).getTime()) /
          86400000,
      ) + 1;
    const useMonths = durationDays > 14;
    return computeNextCycleFromPrevious(
      ac.startDate,
      ac.endDate,
      useMonths,
    ).start;
  }, [ui.pendingRollover?.nextCycleStart, derived.activeCycle]);

  const nextCycleRecurringSummary = useMemo(() => {
    const effective = filterEffectiveRecurringExpenses(
      recurringExpenses,
      nextCycleDate,
    );
    const items = effective
      .map((e) => ({
        name: e.name,
        monthlyAmount: toMonthlyEquivalentAmount(e.amount, e.frequency),
      }))
      .filter((x) => x.monthlyAmount > 0)
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
    const totalMonthly = items.reduce((s, x) => s + x.monthlyAmount, 0);
    return { totalMonthly, items };
  }, [recurringExpenses, nextCycleDate]);
  const { canAccessBudget } = useTierContext();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const { showSuccess, showError } = useAppToast();
  const params = useLocalSearchParams<{ tour?: string; fromVitals?: string }>();
  const {
    startActiveOnboardingIfEligible,
    onboardingLoaded,
  } = useTourContext();
  const { scrollViewRef } = useTour();
  const { isConnected } = useConnectivity();
  const fromVitals = params.fromVitals === "1";
  const [initialSyncAttempted, setInitialSyncAttempted] = useState(false);
  const [showPendingSyncCard, setShowPendingSyncCard] = useState(false);
  const initialSyncRanRef = useRef(false);
  const firstViewLoggedCycleIdRef = useRef<string | null>(null);
  const budgetTourTriggeredRef = useRef(false);

  useEffect(() => {
    const shouldShow = budget.pendingCount > 0 || budget.isSyncing;
    if (!shouldShow) {
      setShowPendingSyncCard(false);
      return;
    }
    const id = setTimeout(() => setShowPendingSyncCard(true), 2500);
    return () => clearTimeout(id);
  }, [budget.isSyncing, budget.pendingCount]);

  const showPostVitalsSkeleton =
    fromVitals &&
    (budget.isLoading ||
      (budget.pendingCount > 0 && !initialSyncAttempted));
  const hasCategories = derived.cycleCategories.length > 0;

  /** Tour zones (budget-overview, budget-actions) exist only when content is shown. */
  const tourZonesReady =
    !!user &&
    !budget.isLoading &&
    !showPostVitalsSkeleton;

  useEffect(() => {
    if (!user?.id || !onboardingLoaded || budget.isLoading || budgetTourTriggeredRef.current) {
      return;
    }

    const state1BudgetStepKey =
      !personalization.isLoading && !personalization.hasProfile
        ? "state1-budget-personalization"
        : "state1-budget-payday";

    if (!tourZonesReady) {
      const timeoutId = setTimeout(() => {
        budgetTourTriggeredRef.current = false;
      }, BUDGET_TOUR_READY_TIMEOUT_MS);
      return () => clearTimeout(timeoutId);
    }

    budgetTourTriggeredRef.current = true;
    void startActiveOnboardingIfEligible("budget", { state1BudgetStepKey });
  }, [
    budget.isLoading,
    onboardingLoaded,
    personalization.hasProfile,
    personalization.isLoading,
    tourZonesReady,
    user?.id,
    startActiveOnboardingIfEligible,
  ]);

  useEffect(() => {
    if (!tourZonesReady) {
      budgetTourTriggeredRef.current = false;
    }
  }, [tourZonesReady]);

  useEffect(() => {
    if (!fromVitals || initialSyncRanRef.current || !user?.id) return;
    if (budget.isLoading) return;
    initialSyncRanRef.current = true;
    if (budget.pendingCount === 0) {
      setInitialSyncAttempted(true);
      return;
    }
    budget
      .syncNow()
      .catch(() => { })
      .finally(() => setInitialSyncAttempted(true));
  }, [fromVitals, user?.id, budget.isLoading, budget.pendingCount, budget.syncNow, budget]);

  // Fire BudgetFirstViewShown once per cycle when overview is actually visible
  useEffect(() => {
    if (
      !user?.id ||
      !derived.activeCycle ||
      !budget.totals ||
      budget.isLoading ||
      showPostVitalsSkeleton
    ) {
      return;
    }
    const cycleId = derived.activeCycle.id;
    if (firstViewLoggedCycleIdRef.current === cycleId) return;
    firstViewLoggedCycleIdRef.current = cycleId;
    analytics.budgetFirstViewShown({
      userId: user.id,
      cycleId,
    });
  }, [
    user?.id,
    derived.activeCycle,
    budget.totals,
    budget.isLoading,
    showPostVitalsSkeleton,
  ]);

  return (
    <View
      style={{ flex: 1, backgroundColor: "black" }}
      className="flex-1 bg-background">
      <ExpandedHeader
        scrollY={scrollY}
        title="Budget"
        subtitle="Needs / Wants / Savings — payday-based."
        actions={[
          isConnected === false && (
            <View
              key="offline"
              className="mr-1 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 flex-row items-center gap-1">
              <WifiOff size={12} color="#FCA5A5" />
              <Text className="text-red-300 font-medium text-[10px]">Offline</Text>
            </View>
          ),
          <InlineSyncPill
            key="sync-pill"
            visible={budget.isSyncing || refreshing || budget.retryIn !== null}
            label={derived.syncPillLabel}
          />,
          (budget.pendingCount > 0 || budget.isSyncing) && (
            <Pressable
              key="queue"
              onPress={() => router.push("/queue")}
              className="px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30">
              <Text className="text-red-300 font-medium text-[10px]">
                {budget.isSyncing ? "Syncing…" : `Sync: ${budget.pendingCount}`}
              </Text>
            </Pressable>
          ),
          !!user && (
            <Pressable
              key="settings"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => { },
                );
                router.push("/budget/settings");
              }}
              className="w-9 h-9 rounded-full justify-center items-center bg-slate-500/10 border border-slate-400/20 active:bg-slate-500/20">
              <Settings size={18} color="#94A3B8" />
            </Pressable>
          ),
        ].filter(Boolean)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <Animated.ScrollView
          ref={scrollViewRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
          snapToEnd={false}
          decelerationRate="fast"
          className="flex-1"
          contentContainerStyle={{
            paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 20,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                onRefresh()
                  .then(() => {
                    showSuccess(
                      "Sync successful",
                      "Your budget has been synced successfully",
                    );
                  })
                  .catch(() => {
                    showError("Error", "Failed to sync budget");
                  });
              }}
              tintColor="#10B981"
              colors={["#10B981"]}
              progressViewOffset={Platform.OS === "android" ? 60 : undefined}
            />
          }>
          <View className="gap-4 mb-6">
            {/* Onboarding: Personalize first (new users who haven't done vitals) */}
            {!!user &&
            !personalization.isLoading &&
            !personalization.setupCompleted &&
            !personalization.hasProfile ? (
              <TourZone
                stepKey="state1-budget-personalization"
                name="Set up your budget foundation"
                description="Finish personalization here so CediWise can build a budget that matches your real payday and spending pattern."
                shape="rounded-rect"
                borderRadius={35}
                style={{ width: "100%" }}>
                <View collapsable={false}>
                  <BudgetPersonalizationCard
                    userId={user?.id}
                    showCta
                    showSummary={false}
                    vitalsSummary={null}
                  />
                </View>
              </TourZone>
            ) : (
              <View collapsable={false}>
                <BudgetPersonalizationCard
                  userId={user?.id}
                  showCta={false}
                  showSummary={false}
                  vitalsSummary={null}
                />
              </View>
            )}

            {/* Cash Flow Widget — F-02 */}
            {!!user && !budget.isLoading && (
              <CashFlowWidget
                visible
                canAccessBudget={canAccessBudget}
                paydayDay={budget.state?.prefs?.paydayDay ?? null}
                prefillSalary={profileVitals.vitals?.stable_salary ?? null}
                cycleTransactions={
                  derived.activeCycleId
                    ? (budget.state?.transactions ?? []).filter(
                        (t) => t.cycleId === derived.activeCycleId
                      )
                    : []
                }
                cycleStartDate={derived.activeCycle?.startDate ?? null}
                onUpgradePress={() => router.push("/upgrade")}
              />
            )}

            {/* Alert zone */}
            <StartNewCycleCard
              visible={
                !!user &&
                derived.cycleIsSet &&
                derived.cycleHasEnded &&
                derived.hasIncomeSources
              }
              startDate={derived.activeCycle?.startDate ?? ""}
              endDate={derived.activeCycle?.endDate ?? ""}
              onStartNewCycle={modals.handleStartNewCycle}
              recurringMonthlyTotal={nextCycleRecurringSummary.totalMonthly}
              recurringCount={nextCycleRecurringSummary.items.length}
            />

            <BudgetPendingSyncCard
              visible={showPendingSyncCard}
              isSyncing={budget.isSyncing}
              onRetry={async () => budget.syncNow()}
            />

            {!user ? (
              <Card>
                <Text className="text-white text-lg font-semibold">
                  Sign in to use Budget
                </Text>
                <Text className="text-muted-foreground text-sm mt-2">
                  Budget data is tied to your account for syncing.
                </Text>
              </Card>
            ) : (budget.isLoading && !budget.state) || showPostVitalsSkeleton ? (
              <BudgetLoadingSkeleton />
            ) : (
              <>
                {!budget.state?.prefs?.paydayDay ? (
                  <TourZone
                    stepKey="state1-budget-payday"
                    name="Set your payday"
                    description="Set your payday here so your budget cycle lines up with the way money actually comes in."
                    shape="rounded-rect"
                    borderRadius={35}
                    style={{ width: "100%" }}>
                    <View collapsable={false}>
                      <BudgetSetupCycleCard
                        salary={form.incomeAmount}
                        onSalaryChange={form.handleSalaryChange}
                        salaryError={form.salaryError}
                        applyDeductions={form.applyDeductions}
                        onApplyDeductionsChange={form.setApplyDeductions}
                        paydayDay={form.paydayDay}
                        cycleDayError={form.cycleDayError}
                        onPaydayChange={form.handlePaydayChange}
                        onCreateBudget={async () => {
                          const day = Math.max(
                            1,
                            Math.min(31, parseInt(form.paydayDay || "25", 10)),
                          );
                          const salary = parseFloat(form.incomeAmount.replace(/,/g, ""));
                          if (isNaN(salary) || salary <= 0) return;

                          // 1. Add income source first
                          await budget.addIncomeSource({
                            name: "Primary Salary",
                            type: "primary",
                            amount: salary,
                            applyDeductions: form.applyDeductions,
                          });

                          // 2. Setup budget structure
                          await budget.setupBudget({
                            paydayDay: day,
                            seedCategories: true, // Seed default categories now since we have income!
                          });
                        }}
                      />
                    </View>
                  </TourZone>
                ) : null}

                {derived.cycleIsSet && !hasCategories ? (
                  <Card>
                    <Text className="text-white text-lg font-semibold">
                      Add categories
                    </Text>
                    <Text className="text-muted-foreground text-sm mt-1">
                      Your cycle is ready. Add categories explicitly to start tracking spending.
                    </Text>
                    <Pressable
                      onPress={() => router.push("/budget/categories")}
                      className="mt-3 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 border border-emerald-400/50 active:bg-emerald-600">
                      <Plus size={16} color="#020617" />
                      <Text className="text-slate-900 font-semibold">Add categories</Text>
                    </Pressable>
                  </Card>
                ) : null}

                <BudgetReallocationBanner
                  visible={
                    !derived.cycleHasEnded &&
                    !!derived.reallocationSuggestion &&
                    !!derived.activeCycleId &&
                    !!derived.activeCycle &&
                    derived.hasIncomeSources
                  }
                  suggestion={derived.reallocationSuggestion ?? null}
                  onApply={async () => {
                    const s = derived.reallocationSuggestion;
                    if (!s?.changes || !derived.activeCycleId) return;
                    const nextState = await budget.updateCycleAllocation(
                      derived.activeCycleId,
                      s.changes,
                      { reallocationReason: s.reason },
                    );
                    await budget.recalculateBudget(nextState ?? undefined);
                    await budget.reload();
                  }}
                />

                <TourZone
                  stepKey="state2-budget-overview"
                  name="Your budget overview"
                  description="This overview shows how your money is allocated so you can quickly see whether your plan is on track."
                  shape="rounded-rect"
                  borderRadius={16}
                  style={{ width: "100%" }}>
                  <View collapsable={false}>
                    <BudgetOverviewCard
                      visible={
                        derived.cycleIsSet &&
                        !!budget.totals
                      }
                      cycle={derived.activeCycle}
                      totals={budget.totals}
                      healthScore={ui.budgetHealthScore?.score ?? null}
                      healthLabel={
                        (ui.budgetHealthScore?.score ?? 0) >= 75
                          ? "On track"
                          : (ui.budgetHealthScore?.score ?? 0) >= 50
                            ? "Needs attention"
                            : "At risk"
                      }
                      healthSummary={ui.budgetHealthScore?.summary}
                      canAccessBudget={canAccessBudget}
                    />
                  </View>
                </TourZone>

                <TourZone
                  stepKey="state2-budget-tools"
                  name="Organize your categories"
                  description="Quickly manage your categories, income sources, and insights from here to keep your budget healthy."
                  shape="rounded-rect"
                  borderRadius={12}
                  style={{ width: "100%" }}>
                  <View collapsable={false}>
                    <BudgetQuickActions
                      visible={derived.cycleIsSet}
                      onLogExpense={() => modals.setShowTxModal(true)}
                      disabledLogExpense={!derived.activeCycleId}
                    />
                  </View>
                </TourZone>

                <TourZone
                  stepKey="state2-budget-expenses"
                  name="Track your spending"
                  description="Record and review expenses here so your budget reflects what is really happening month to month."
                  shape="rounded-rect"
                  borderRadius={16}
                  style={{ width: "100%" }}>
                  <View collapsable={false}>
                    <BudgetExpensesCard
                      visible={derived.cycleIsSet}
                      activeCycleId={derived.activeCycleId}
                      filter={ui.filter}
                      setFilter={ui.setFilter}
                      transactions={derived.cycleTransactions}
                      categories={derived.cycleCategories.map((c) => ({
                        id: c.id,
                        name: c.name,
                      }))}
                      onLogExpense={() => {
                        if (!derived.activeCycleId || derived.cycleHasEnded) {
                          showError(
                            "Start a new cycle",
                            "Set up or start a new cycle to add expenses.",
                          );
                          return;
                        }
                        modals.setShowTxModal(true);
                      }}
                      onShowMore={() => router.push("/expenses")}
                      previewCount={3}
                    />
                  </View>
                </TourZone>

                <BudgetToolsCard visible={!!user && derived.cycleIsSet} />
              </>
            )}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <BudgetModals
        showAddCustomCategoryModal={modals.showAddCustomCategoryModal}
        setShowAddCustomCategoryModal={modals.setShowAddCustomCategoryModal}
        onAddCategory={modals.handleAddCategory}
        showTxModal={modals.showTxModal}
        setShowTxModal={modals.setShowTxModal}
        cycleCategories={derived.cycleCategories}
        needsOverLimitFor={derived.needsOverLimitFor}
        onAddTransaction={async (params) => {
          await budget.addTransaction(params);
        }}
        pendingConfirm={modals.pendingConfirm}
        setPendingConfirm={modals.setPendingConfirm}
        showNeedsOverModal={modals.showNeedsOverModal}
        setShowNeedsOverModal={modals.setShowNeedsOverModal}
        showResetConfirm={modals.showResetConfirm}
        setShowResetConfirm={modals.setShowResetConfirm}
        onResetBudget={async () => {
          modals.setShowResetConfirm(false);
          await budget.resetBudget();
          await budget.reload();
        }}
        categoryToDelete={modals.categoryToDelete}
        setCategoryToDelete={modals.setCategoryToDelete}
        showDeleteCategoryConfirm={modals.showDeleteCategoryConfirm}
        setShowDeleteCategoryConfirm={modals.setShowDeleteCategoryConfirm}
        onDeleteCategory={async (id) => {
          await budget.deleteCategory(id);
          await budget.reload();
        }}
        incomeToDelete={modals.incomeToDelete}
        setIncomeToDelete={modals.setIncomeToDelete}
        showDeleteIncomeConfirm={modals.showDeleteIncomeConfirm}
        setShowDeleteIncomeConfirm={modals.setShowDeleteIncomeConfirm}
        onDeleteIncomeSource={async (id) => {
          const result = await budget.deleteIncomeSource(id);
          await budget.reload();
          if (result?.syncError) {
            showError("Sync failed", result.syncError);
          }
        }}
        incomeToEdit={modals.incomeToEdit}
        setIncomeToEdit={modals.setIncomeToEdit}
        showEditIncomeModal={modals.showEditIncomeModal}
        setShowEditIncomeModal={modals.setShowEditIncomeModal}
        onUpdateIncomeSource={async (id, next) => {
          if (!modals.incomeToEdit) return;
          const result = await budget.updateIncomeSource(id, {
            name: next.name ?? modals.incomeToEdit.name,
            type: next.type ?? modals.incomeToEdit.type,
            amount: next.amount ?? modals.incomeToEdit.amount,
            applyDeductions:
              next.applyDeductions ?? modals.incomeToEdit.applyDeductions,
          });
          await budget.reload();
          if (result?.syncError) {
            showSuccess("Income updated", "Saved locally; sync failed. It will retry.");
            showError("Sync failed", result.syncError);
          } else {
            showSuccess("Income updated", "Your income source has been updated.");
          }
        }}
        editingLimit={modals.editingLimit}
        setEditingLimit={modals.setEditingLimit}
        showEditLimitModal={modals.showEditLimitModal}
        setShowEditLimitModal={modals.setShowEditLimitModal}
        onUpdateCategoryLimit={modals.handleUpdateCategoryLimit}
        spendingInsights={ui.spendingInsights}
        allocationExceededResult={modals.allocationExceededResult}
        showAllocationExceededModal={modals.showAllocationExceededModal}
        setShowAllocationExceededModal={modals.setShowAllocationExceededModal}
        onConfirmAllocationExceeded={modals.onConfirmAllocationExceeded}
        onCloseAllocationExceeded={modals.handleCloseAllocationExceeded}
        showEditCycleModal={modals.showEditCycleModal}
        setShowEditCycleModal={modals.setShowEditCycleModal}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async (nextDay) => {
          await budget.updateCycleDay(nextDay);
          await budget.reload();
        }}
      />

      <DeficitResolutionModal
        visible={modals.showDeficitModal}
        deficitAmount={modals.pendingDeficit?.deficitAmount ?? 0}
        cycleLabel={modals.pendingDeficit?.cycleLabel ?? ""}
        onClose={modals.handleCloseDeficitModal}
        onResolve={modals.handleDeficitResolve}
      />

      <AddDebtModal
        visible={modals.showAddDebtFromDeficitModal}
        onClose={modals.handleCloseAddDebtFromDeficit}
        onSubmit={modals.handleAddDebtFromDeficitSubmit}
        initialValues={
          modals.pendingAddDebtFromDeficit
            ? {
                name: `Cycle overrun – ${modals.pendingAddDebtFromDeficit.cycleLabel}`,
                totalAmount: modals.pendingAddDebtFromDeficit.deficitAmount,
                remainingAmount: modals.pendingAddDebtFromDeficit.deficitAmount,
                monthlyPayment: modals.pendingAddDebtFromDeficit.deficitAmount,
              }
            : null
        }
        sourceCycleId={modals.pendingAddDebtFromDeficit?.cycleId ?? null}
      />

      <RolloverAllocationModal
        visible={!!ui.pendingRollover}
        totalAmount={
          ui.pendingRollover
            ? ui.pendingRollover.rollover.needs +
            ui.pendingRollover.rollover.wants +
            ui.pendingRollover.rollover.savings
            : 0
        }
        destinations={ui.pendingRollover?.savingsCategories ?? []}
        nextCycleStart={ui.pendingRollover?.nextCycleStart ?? ""}
        nextCycleEnd={ui.pendingRollover?.nextCycleEnd ?? ""}
        durationDays={ui.pendingRollover?.durationDays ?? 30}
        durationUnit={ui.pendingRollover?.durationUnit ?? "months"}
        durationMonths={ui.pendingRollover?.durationMonths ?? 1}
        paydayDay={ui.pendingRollover?.paydayDay ?? 1}
        nextCycleRecurring={
          nextCycleRecurringSummary.totalMonthly > 0 &&
          nextCycleRecurringSummary.items.length > 0
            ? nextCycleRecurringSummary
            : null
        }
        onClose={() => ui.setPendingRollover(null)}
        onConfirm={modals.handleRolloverConfirm}
      />

      {modals.budgetPreferenceMigration ? (
        <MigrationPrompt
          visible
          lifeStagePhrase={modals.budgetPreferenceMigration.lifeStagePhrase}
          financialPriorityPhrase={
            modals.budgetPreferenceMigration.financialPriorityPhrase
          }
          currentAllocations={modals.budgetPreferenceMigration.current}
          suggestedAllocations={modals.budgetPreferenceMigration.suggested}
          onConfirm={modals.handleConfirmBudgetPreferenceMigration}
          onCancel={modals.handleDismissBudgetPreferenceMigration}
        />
      ) : null}
    </View>
  );
}
