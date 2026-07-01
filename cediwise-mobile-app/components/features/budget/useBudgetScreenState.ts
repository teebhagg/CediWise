import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  computeBudgetHealthScore,
  generateAdvisorRecommendations,
} from "../../../calculators/budget-advisor";
import { useAuth } from "../../../hooks/useAuth";
import { useBudget } from "../../../hooks/useBudget";
import { useDebts } from "../../../hooks/useDebts";
import { usePersonalizationStatus } from "../../../hooks/usePersonalizationStatus";
import { useProfileVitals } from "../../../hooks/useProfileVitals";
import type { BudgetBucket, BudgetEngineMode, BudgetEnforcement } from "../../../types/budget";
import { checkCategoryLimitImpact } from "../../../utils/allocationExceeded";
import {
  applyRebalancePreview,
  buildRebalancePreview,
  mergeAIRebalancePreview,
  type RebalancePreview,
} from "../../../utils/budgetRebalance";
import { fetchAIRebalancePlan } from "../../../utils/fetchAIRebalancePlan";
import {
  trackBudgetOverNetAcknowledged,
  trackBudgetReconcileApplied,
  trackBudgetReconcileDismissed,
  trackBudgetReconcileShown,
  trackBudgetUnassignedSlack,
} from "../../../utils/budgetAnalytics";
import {
  buildNwsAdjustPreview,
} from "../../../utils/budgetNwsAdjust";
import {
  getPlanViolationOverflow,
  shouldShowReconcileBanner,
} from "../../../utils/budgetReconcileBanner";
import {
  DEFAULT_BUDGET_ENFORCEMENT,
  normalizeBudgetEnforcement,
} from "../../../utils/budgetPlanConstants";
import { validateBudgetPlan, getPrimaryViolation } from "../../../utils/budgetPlanValidation";
import {
  normalizeBudgetEngineMode,
  shouldShowBudgetEngineRecommendations,
} from "../../../utils/budgetEngine";
import {
  computeCycleDeficit,
  getResolutionForCycle,
  saveDeficitResolution,
  type CycleDeficitResolutionChoice,
} from "../../../utils/cycleDeficit";
import { computeGhanaTax2026Monthly } from "../../../utils/ghanaTax";
import {
  analyzeAndSuggestReallocation,
  type ReallocationSuggestion,
} from "../../../utils/reallocationEngine";
import {
  getSpendingInsights,
  type SpendingInsight,
} from "../../../utils/spendingPatterns";
import { getActiveTaxConfig, type TaxConfig } from "../../../utils/taxSync";
import { DEFAULT_MIN_LIVING_BUFFER } from "../vitals/utils";
import { useBudgetStore } from "@/stores/budgetStore";
import { useProfileVitalsStore } from "@/stores/profileVitalsStore";
import { useRecurringExpensesStore } from "@/stores/recurringExpensesStore";
import { reportError } from "@/utils/telemetry";
import { waitWhile } from "@/utils/waitWhile";

export function useBudgetScreenState() {
  const router = useRouter();
  const { user } = useAuth();
  const personalization = usePersonalizationStatus(user?.id);
  const profileVitals = useProfileVitals(user?.id);
  const {
    state,
    isLoading,
    isSyncing,
    retryIn,
    pendingCount,
    totals,
    setupBudget,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    addTransaction,
    submitBatchTransactions,
    addCategory,
    deleteCategory,
    deleteCategories,
    updateCategoryLimit,
    updateCycleDay,
    updateCycleAllocation,
    updateBudgetEngineMode,
    updateBudgetEnforcement,
    resetBudget,
    deleteAllBudgetData,
    computeNewCyclePreview,
    createNewCycleFromPreview,
    createNewCycleImmediate,
    hydrateFromRemote,
    recalculateBudget,
    reload,
    syncNow,
  } = useBudget(user?.id);

  const { addDebt } = useDebts(totals?.monthlyNetIncome ?? 0);

  const [refreshing, setRefreshing] = useState(false);
  const didVitalsRefreshRef = useRef(false);

  const [paydayDay, setPaydayDay] = useState("25");
  const [cycleDayError, setCycleDayError] = useState<string | null>(null);
  const [incomeName, setIncomeName] = useState("Primary Salary");
  const [incomeType, setIncomeType] = useState<"primary" | "side">("primary");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [applyDeductions, setApplyDeductions] = useState(true);

  const [showTxModal, setShowTxModal] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    bucket: BudgetBucket;
    categoryId?: string | null;
    amount: number;
    note?: string;
  } | null>(null);
  const [showNeedsOverModal, setShowNeedsOverModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] =
    useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteIncomeConfirm, setShowDeleteIncomeConfirm] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<{
    id: string;
    name: string;
    type: "primary" | "side";
    amount: number;
    applyDeductions: boolean;
  } | null>(null);
  const [showEditIncomeModal, setShowEditIncomeModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<{
    id: string;
    name: string;
    current: number;
    icon?: string | null;
    /** Phase 3.2: Pre-filled from advisor limit_adjustment */
    suggestedLimit?: number;
  } | null>(null);
  const [showEditLimitModal, setShowEditLimitModal] = useState(false);
  const [showEditCycleModal, setShowEditCycleModal] = useState(false);
  const [showAddCustomCategoryModal, setShowAddCustomCategoryModal] =
    useState(false);
  const [allocationExceededResult, setAllocationExceededResult] = useState<
    import("../../../utils/allocationExceeded").AllocationExceededResult | null
  >(null);
  const [showAllocationExceededModal, setShowAllocationExceededModal] =
    useState(false);
  const [pendingCategoryAction, setPendingCategoryAction] = useState<
    | {
        type: "add";
        params: {
          name: string;
          bucket: BudgetBucket;
          limitAmount: number;
          icon?: import("../../../constants/categoryIcons").CategoryIconName;
        };
      }
    | {
        type: "update";
        id: string;
        nextLimit: number;
        icon?: import("../../../constants/categoryIcons").CategoryIconName;
      }
    | null
  >(null);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [bucketOpen, setBucketOpen] = useState<Record<BudgetBucket, boolean>>({
    needs: true,
    wants: false,
    savings: false,
  });
  const [spendingInsights, setSpendingInsights] = useState<
    SpendingInsight[] | null
  >(null);
  const [advisorRecommendations, setAdvisorRecommendations] = useState<
    import("../../../calculators/budget-advisor").AdvisorRecommendation[] | null
  >(null);
  const [budgetHealthScore, setBudgetHealthScore] = useState<{
    score: number;
    summary: string;
  } | null>(null);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const recurringExpenses = useRecurringExpensesStore(
    (s) => s.recurringExpenses,
  );

  useEffect(() => {
    getActiveTaxConfig().then(setTaxConfig);
  }, []);

  useEffect(() => {
    void useRecurringExpensesStore.getState().initForUser(user?.id ?? null);
  }, [user?.id]);

  const [spendingInsightsLoading, setSpendingInsightsLoading] = useState(false);
  const [pendingRollover, setPendingRollover] = useState<{
    rollover: { needs: number; wants: number; savings: number };
    savingsCategories: { id: string; name: string }[];
    nextCycleStart: string;
    nextCycleEnd: string;
    durationDays: number;
    durationUnit: "days" | "months";
    durationMonths?: number;
    paydayDay: number;
  } | null>(null);

  const [pendingDeficit, setPendingDeficit] = useState<{
    cycleId: string;
    cycleLabel: string;
    deficitAmount: number;
  } | null>(null);

  /** When user chose "Financed" in deficit modal – show Add Debt with prefill */
  const [pendingAddDebtFromDeficit, setPendingAddDebtFromDeficit] = useState<{
    cycleId: string;
    cycleLabel: string;
    deficitAmount: number;
  } | null>(null);


  useEffect(() => {
    if (!user?.id) return;
    if (didVitalsRefreshRef.current) return;
    didVitalsRefreshRef.current = true;
    void profileVitals.refresh();
  }, [profileVitals, user?.id]);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const incomeToggleAnim = useSharedValue(showIncomeForm ? 1 : 0);
  useEffect(() => {
    incomeToggleAnim.value = withTiming(showIncomeForm ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [incomeToggleAnim, showIncomeForm]);

  const incomeToggleChevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(incomeToggleAnim.value, [0, 1], [0, 45])}deg`,
      },
    ],
  }));

  // ─── Active Cycle: Get the most recent cycle ─────────────────────────────────────
  const activeCycleId = useMemo(() => {
    const sorted = [...(state?.cycles ?? [])].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    return sorted[0]?.id ?? null;
  }, [state?.cycles]);

  const activeCycle = useMemo(() => {
    const sorted = [...(state?.cycles ?? [])].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    return sorted[0] ?? null;
  }, [state?.cycles]);

  const budgetEngineMode = useMemo<BudgetEngineMode>(
    () => normalizeBudgetEngineMode(state?.prefs?.budgetEngineMode ?? null),
    [state?.prefs?.budgetEngineMode],
  );

  const budgetEnforcement = useMemo<BudgetEnforcement>(
    () =>
      normalizeBudgetEnforcement(
        state?.prefs?.budgetEnforcement ?? DEFAULT_BUDGET_ENFORCEMENT,
      ),
    [state?.prefs?.budgetEnforcement],
  );

  const previousCycle = useMemo(() => {
    const sorted = [...(state?.cycles ?? [])].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    return sorted[1] ?? null;
  }, [state?.cycles]);

  const reallocationSuggestion = useMemo((): ReallocationSuggestion | null => {
    if (!shouldShowBudgetEngineRecommendations(budgetEngineMode)) {
      return null;
    }
    if (!previousCycle) {
      return null;
    }
    if (!totals || totals.monthlyNetIncome <= 0) {
      return null;
    }
    if (!state?.transactions?.length) {
      return null;
    }
    if (activeCycle?.reallocationApplied) {
      return null;
    }
    const suggestion = analyzeAndSuggestReallocation(
      previousCycle,
      state.transactions,
      totals.monthlyNetIncome,
      totals.disposableIncome,
    );
    return suggestion.shouldReallocate ? suggestion : null;
  }, [
    previousCycle,
    totals,
    state?.transactions,
    activeCycle?.reallocationApplied,
    budgetEngineMode,
  ]);

  const cycleIsSet = !!state?.prefs?.paydayDay && !!activeCycleId;
  const hasIncomeSources = (state?.incomeSources?.length ?? 0) > 0;
  // ─── Active Cycle: Check if the cycle has ended: "endDate + "T23:59:59" means 11:59:59 PM of the end date" ─────────────────────────────────────
  const cycleHasEnded =
    !!activeCycle && new Date() > new Date(activeCycle.endDate + "T23:59:59");

  const vitalsSummary = useMemo(() => {
    const v = profileVitals.vitals;
    if (!v?.setup_completed) return null;
    const netSalary = v.auto_tax
      ? computeGhanaTax2026Monthly(v.stable_salary, taxConfig ?? undefined)
          .netTakeHome
      : v.stable_salary;
    const netIncome = Math.max(0, netSalary + v.side_income);
    const fixedCosts = Math.max(
      0,
      v.rent +
        v.tithe_remittance +
        v.debt_obligations +
        v.utilities_total +
        DEFAULT_MIN_LIVING_BUFFER,
    );
    const ratio = netIncome > 0 ? fixedCosts / netIncome : null;
    return { v, netIncome, fixedCosts, ratio };
  }, [profileVitals.vitals, taxConfig]);

  const allocationTitle = useMemo(() => {
    if (!activeCycle) return "Allocation";
    const n = (activeCycle.needsPct * 100).toFixed(0);
    const w = (activeCycle.wantsPct * 100).toFixed(0);
    const s = (activeCycle.savingsPct * 100).toFixed(0);
    return `${n} / ${w} / ${s} allocation`;
  }, [activeCycle]);

  const cycleCategories = useMemo(() => {
    if (!state || !activeCycleId) return [];
    return state.categories.filter((c) => c.cycleId === activeCycleId);
  }, [activeCycleId, state]);

  const planValidation = useMemo(() => {
    if (!activeCycle || !state?.incomeSources?.length) return null;
    return validateBudgetPlan({
      cycle: activeCycle,
      categories: cycleCategories,
      incomeSources: state.incomeSources,
    });
  }, [activeCycle, cycleCategories, state?.incomeSources]);

  const rebalanceContext = useMemo(() => {
    const spentByCategoryId: Record<string, number> = {};
    if (state?.transactions && activeCycleId) {
      for (const tx of state.transactions) {
        if (tx.cycleId !== activeCycleId || !tx.categoryId) continue;
        spentByCategoryId[tx.categoryId] =
          (spentByCategoryId[tx.categoryId] ?? 0) + tx.amount;
      }
    }
    const preferredTrimCategoryIds = new Set<string>();
    for (const rec of advisorRecommendations ?? []) {
      if (
        rec.type === "limit_adjustment" &&
        rec.categoryId &&
        rec.suggestedLimit != null &&
        rec.currentLimit != null &&
        rec.suggestedLimit < rec.currentLimit
      ) {
        preferredTrimCategoryIds.add(rec.categoryId);
      }
    }
    return {
      lifeStage:
        state?.prefs?.lifeStage ?? profileVitals.vitals?.life_stage ?? null,
      spendingStyle: profileVitals.vitals?.spending_style ?? null,
      financialPriority: profileVitals.vitals?.financial_priority ?? null,
      interests: state?.prefs?.interests,
      spentByCategoryId,
      preferredTrimCategoryIds,
      recurringExpenses,
    };
  }, [
    activeCycleId,
    advisorRecommendations,
    profileVitals.vitals?.financial_priority,
    profileVitals.vitals?.life_stage,
    profileVitals.vitals?.spending_style,
    recurringExpenses,
    state?.prefs?.interests,
    state?.prefs?.lifeStage,
    state?.transactions,
  ]);

  const [rebalancePreview, setRebalancePreview] = useState<RebalancePreview | null>(
    null,
  );
  const [rebalanceLoading, setRebalanceLoading] = useState(false);

  const isSurvivalMode = useMemo(
    () => planValidation?.violations.some((v) => v.type === "L4") ?? false,
    [planValidation],
  );

  const offendingBucket = useMemo((): BudgetBucket | null => {
    if (!planValidation) return null;
    const primary = getPrimaryViolation(planValidation);
    if (primary?.type === "L2" && primary.bucket) return primary.bucket;
    const overBucket = (["needs", "wants", "savings"] as const).find(
      (b) => planValidation.buckets[b].status === "over",
    );
    return overBucket ?? null;
  }, [planValidation]);

  const showReconcileBanner = useMemo(
    () =>
      shouldShowReconcileBanner({
        validation: planValidation,
        dismissedAt: state?.prefs?.lastReconcileBannerDismissedAt,
        dismissedOverflow: state?.prefs?.lastReconcileBannerDismissedOverflow,
      }),
    [
      planValidation,
      state?.prefs?.lastReconcileBannerDismissedAt,
      state?.prefs?.lastReconcileBannerDismissedOverflow,
    ],
  );

  const nwsAdjustPreview = useMemo(() => {
    if (!activeCycle || !state?.incomeSources?.length) return null;
    return buildNwsAdjustPreview({
      cycle: activeCycle,
      proposed: {
        needsPct: activeCycle.needsPct,
        wantsPct: activeCycle.wantsPct,
        savingsPct: activeCycle.savingsPct,
      },
      categories: cycleCategories,
      incomeSources: state.incomeSources,
    });
  }, [activeCycle, cycleCategories, state?.incomeSources]);

  const showUnassignedNudge = false;

  const [showReconcileSheet, setShowReconcileSheet] = useState(false);
  const [showRebalancePreview, setShowRebalancePreview] = useState(false);
  const [showFlexibleOverNetAck, setShowFlexibleOverNetAck] = useState(false);
  const [showNwsAdjustSheet, setShowNwsAdjustSheet] = useState(false);
  const [showSurvivalSheet, setShowSurvivalSheet] = useState(false);

  const categoriesByBucket = useMemo(() => {
    const buckets: Record<BudgetBucket, typeof cycleCategories> = {
      needs: [],
      wants: [],
      savings: [],
    };
    for (const c of cycleCategories) buckets[c.bucket].push(c);
    return buckets;
  }, [cycleCategories]);

  const cycleTransactions = useMemo(() => {
    if (!state || !activeCycleId) return [];
    return state.transactions.filter((t) => t.cycleId === activeCycleId);
  }, [activeCycleId, state]);

  useEffect(() => {
    if (
      !user?.id ||
      !activeCycleId ||
      cycleCategories.length === 0 ||
      !state?.transactions
    ) {
      setSpendingInsights(null);
      setAdvisorRecommendations(null);
      setBudgetHealthScore(null);
      return;
    }
    let cancelled = false;
    setSpendingInsightsLoading(true);
    getSpendingInsights(
      user.id,
      activeCycleId,
      cycleCategories.map((c) => ({
        id: c.id,
        name: c.name,
        limitAmount: c.limitAmount,
      })),
      state.transactions,
    )
      .then((insights) => {
        if (!cancelled) {
          setSpendingInsights(insights);
          const catById = new Map(cycleCategories.map((c) => [c.id, c]));
          const recs = generateAdvisorRecommendations(
            insights.map((i) => ({
              categoryId: i.categoryId,
              categoryName: i.categoryName,
              bucket: catById.get(i.categoryId)?.bucket,
              spent: i.spent,
              limit: i.limit,
              avgSpent: i.avgSpent,
              trend: i.trend,
              variance: i.variance,
              confidence: i.confidence,
            })),
            totals
              ? {
                  needsSpent: totals.spentByBucket.needs,
                  wantsSpent: totals.spentByBucket.wants,
                  savingsSpent: totals.spentByBucket.savings,
                  needsLimit: totals.needsLimit,
                  wantsLimit: totals.wantsLimit,
                  savingsLimit: totals.savingsLimit,
                }
              : undefined,
            { cycleEndDate: activeCycle?.endDate },
          );
          setAdvisorRecommendations(recs);
          if (totals) {
            const overCount = insights.filter(
              (i) => i.spent > i.limit && i.limit > 0,
            ).length;
            const overDetails = insights
              .filter((i) => i.spent > i.limit && i.limit > 0)
              .map((i) => ({
                categoryName: i.categoryName,
                overAmount: i.spent - i.limit,
              }));
            const overTrends = overDetails.length
              ? insights.filter((i) => i.spent > i.limit).map((i) => i.trend)
              : [];
            const overspendTrend = overTrends.includes("increasing")
              ? "increasing"
              : overTrends.includes("decreasing")
                ? "decreasing"
                : undefined;
            const savingsInsights = insights.filter((i) =>
              catById.get(i.categoryId)
                ? catById.get(i.categoryId)!.bucket === "savings"
                : false,
            );
            const savingsTrend = savingsInsights.some(
              (i) => i.trend === "increasing",
            )
              ? "increasing"
              : savingsInsights.some((i) => i.trend === "decreasing")
                ? "decreasing"
                : undefined;
            const savingsConsistent =
              totals.savingsLimit > 0 &&
              totals.spentByBucket.savings >= totals.savingsLimit * 0.8;

            const health = computeBudgetHealthScore({
              needsSpent: totals.spentByBucket.needs,
              wantsSpent: totals.spentByBucket.wants,
              savingsSpent: totals.spentByBucket.savings,
              needsLimit: totals.needsLimit,
              wantsLimit: totals.wantsLimit,
              savingsLimit: totals.savingsLimit,
              categoriesOver: overCount,
              categoriesTotal: insights.length,
              categoryOverDetails:
                overDetails.length > 0 ? overDetails : undefined,
              overspendTrend,
              savingsTrend,
              savingsConsistent,
            });
            const allocationHints: string[] = [];
            if (activeCycle && totals.monthlyNetIncome > 0) {
              if (activeCycle.savingsPct < 0.05) {
                allocationHints.push(
                  "Savings is below 5%. Consider increasing to build an emergency fund.",
                );
              }
              const totalAllocated =
                totals.needsLimit + totals.wantsLimit + totals.savingsLimit;
              const flexBase = totals.disposableIncome;
              if (flexBase > 0 && totalAllocated > flexBase * 1.05) {
                allocationHints.push(
                  "Category limits exceed your net income envelope. Review allocations or turn off auto-allocate on recurring bills.",
                );
              }
            }
            const summary =
              allocationHints.length > 0
                ? `${health.summary} ${allocationHints.join(" ")}`
                : health.summary;
            setBudgetHealthScore({ score: health.score, summary });
          } else {
            setBudgetHealthScore(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setSpendingInsights(null);
      })
      .finally(() => {
        if (!cancelled) setSpendingInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    activeCycleId,
    activeCycle,
    cycleCategories,
    state?.transactions,
    totals,
  ]);

  const needsOverLimitFor = useMemo(() => {
    if (!state || !activeCycleId) return () => false;
    return (categoryId: string | null | undefined, nextAmount: number) => {
      if (!categoryId) return false;
      const category = state.categories.find((c) => c.id === categoryId);
      if (!category || category.bucket !== "needs" || category.limitAmount <= 0)
        return false;
      const spent = state.transactions
        .filter(
          (t) =>
            t.cycleId === activeCycleId &&
            t.bucket === "needs" &&
            t.categoryId === categoryId,
        )
        .reduce((s, t) => s + t.amount, 0);
      return spent + nextAmount > category.limitAmount;
    };
  }, [activeCycleId, state]);

  const syncPillLabel =
    retryIn !== null
      ? `Trying again in ${retryIn}…`
      : isSyncing || refreshing
        ? "Syncing…"
        : pendingCount > 0
          ? `${pendingCount} pending`
          : "Synced";

  const incomeAccentColors = useMemo(
    () => [
      "#22C55E",
      "#3B82F6",
      "#A855F7",
      "#06B6D4",
      "#F59E0B",
      "#84CC16",
      "#14B8A6",
    ],
    [],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await syncNow(); // Sync the budget state with the remote
      await hydrateFromRemote({ force: true }); // Hydrate the budget state from the remote
      await profileVitals.refresh(); // Refresh the profile vitals
      await reload(); // Reload the budget state
      await recalculateBudget(); // Recalculate the budget
    } catch {
      // ignore
    } finally {
      try {
        await waitWhile(
          () => {
            const s = useBudgetStore.getState();
            return (
              s.isLoading ||
              s.isSyncing ||
              useProfileVitalsStore.getState().isLoading
            );
          },
          { timeoutMs: 20_000, intervalMs: 48 },
        );
        // Ensure spinner is visible for at least 500ms so users see feedback
        const elapsed = Date.now() - start;
        if (elapsed < 500) {
          await new Promise((r) => setTimeout(r, 500 - elapsed));
        }
      } catch (error) {
        reportError(error, {
          feature: "budget",
          operation: "on_refresh_wait_while",
        });
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handlePaydayChange = (v: string) => {
    setPaydayDay(v);
    const n = parseInt(v, 10);
    if (!v) {
      setCycleDayError("Enter a day between 1 and 31");
    } else if (!Number.isFinite(n) || n < 1 || n > 31) {
      setCycleDayError("Day must be between 1 and 31");
    } else {
      setCycleDayError(null);
    }
  };

  const handleSalaryChange = (v: string) => {
    setIncomeAmount(v);
    const n = parseFloat(v.replace(/,/g, ""));
    if (!v) {
      setSalaryError("Salary is required");
    } else if (isNaN(n) || n <= 0) {
      setSalaryError("Enter a valid positive amount");
    } else {
      setSalaryError(null);
    }
  };

  const toggleIncomeForm = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    LayoutAnimation.configureNext({
      duration: 260,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setShowIncomeForm((prev) => !prev);
  };

  const handleAddCategory = useCallback(
    async (params: {
      name: string;
      bucket: BudgetBucket;
      limitAmount: number;
      icon?: import("../../../constants/categoryIcons").CategoryIconName;
    }) => {
      if (!activeCycle || !state?.categories?.length) {
        await addCategory(params);
        return;
      }
      const result = checkCategoryLimitImpact({
        cycle: activeCycle,
        categories: state.categories,
        incomeSources: state.incomeSources,
        bucket: params.bucket,
        newLimit: params.limitAmount ?? 0,
        categoryId: undefined,
      });
      if (!result.exceedsBucket && !result.exceedsIncome) {
        await addCategory(params);
        return;
      }
      setShowAddCustomCategoryModal(false);
      setAllocationExceededResult(result);
      setPendingCategoryAction({ type: "add", params });
      setShowAllocationExceededModal(true);
    },
    [activeCycle, state?.categories, state?.incomeSources, addCategory],
  );

  const handleUpdateCategoryLimit = useCallback(
    async (
      id: string,
      nextLimit: number,
      icon?: import("../../../constants/categoryIcons").CategoryIconName,
    ) => {
      if (!activeCycle || !state?.categories?.length) {
        await updateCategoryLimit(id, nextLimit, icon);
        return;
      }
      const category = state.categories.find((c) => c.id === id);
      if (!category) {
        await updateCategoryLimit(id, nextLimit, icon);
        return;
      }
      const result = checkCategoryLimitImpact({
        cycle: activeCycle,
        categories: state.categories,
        incomeSources: state.incomeSources,
        bucket: category.bucket,
        newLimit: nextLimit,
        categoryId: id,
      });
      if (!result.exceedsBucket && !result.exceedsIncome) {
        await updateCategoryLimit(id, nextLimit, icon);
        return;
      }
      setShowEditLimitModal(false);
      setEditingLimit(null);
      setAllocationExceededResult(result);
      setPendingCategoryAction({ type: "update", id, nextLimit, icon });
      setShowAllocationExceededModal(true);
    },
    [activeCycle, state?.categories, state?.incomeSources, updateCategoryLimit],
  );

  const onConfirmAllocationExceeded = useCallback(async () => {
    if (!pendingCategoryAction || !allocationExceededResult) return;
    if (
      allocationExceededResult.exceedsIncome &&
      budgetEnforcement === "flexible" &&
      !showFlexibleOverNetAck
    ) {
      setShowFlexibleOverNetAck(true);
      return;
    }
    if (showFlexibleOverNetAck && allocationExceededResult.exceedsIncome) {
      trackBudgetOverNetAcknowledged({
        overflowAmount: allocationExceededResult.debtAmount,
        source: "edit",
      });
    }
    if (allocationExceededResult.suggestedAllocation && activeCycle) {
      await updateCycleAllocation(
        activeCycle.id,
        allocationExceededResult.suggestedAllocation,
      );
    }
    await proceedPendingCategoryAction();
  }, [
    activeCycle,
    allocationExceededResult,
    budgetEnforcement,
    pendingCategoryAction,
    proceedPendingCategoryAction,
    showFlexibleOverNetAck,
    updateCycleAllocation,
  ]);

  const onConfirmFlexibleOverNet = useCallback(async () => {
    if (!pendingCategoryAction || !allocationExceededResult) return;
    if (allocationExceededResult.suggestedAllocation && activeCycle) {
      await updateCycleAllocation(
        activeCycle.id,
        allocationExceededResult.suggestedAllocation,
      );
    }
    await proceedPendingCategoryAction();
  }, [
    activeCycle,
    allocationExceededResult,
    pendingCategoryAction,
    proceedPendingCategoryAction,
    updateCycleAllocation,
  ]);

  const handleCloseAllocationExceeded = useCallback(() => {
    setShowAllocationExceededModal(false);
    setAllocationExceededResult(null);
    setPendingCategoryAction(null);
    setShowFlexibleOverNetAck(false);
  }, []);

  const persistPrefsPatch = useCallback(
    async (patch: Partial<import("../../../types/budget").BudgetProfilePrefs>) => {
      if (!user?.id) return;
      const current = useBudgetStore.getState().state;
      if (!current) return;
      await useBudgetStore.getState().persistState({
        ...current,
        prefs: { ...current.prefs, ...patch },
      });
    },
    [user?.id],
  );

  const persistReconcileDismissed = useCallback(async () => {
    if (!user?.id || !activeCycleId) return;
    await persistPrefsPatch({
      reconcileSheetDismissedForCycleId: activeCycleId,
    });
  }, [activeCycleId, persistPrefsPatch, user?.id]);

  const handleDismissReconcileSheet = useCallback(async () => {
    await persistReconcileDismissed();
    trackBudgetReconcileDismissed({ enforcement: budgetEnforcement });
    setShowReconcileSheet(false);
    setShowRebalancePreview(false);
  }, [budgetEnforcement, persistReconcileDismissed]);

  /** Any close/backdrop dismiss — persist so the sheet stays closed for this cycle. */
  const handleCloseReconcileSheet = useCallback(async () => {
    await persistReconcileDismissed();
    setShowReconcileSheet(false);
    setShowRebalancePreview(false);
  }, [persistReconcileDismissed]);

  const handleDismissReconcileBanner = useCallback(async () => {
    if (!planValidation) return;
    await persistPrefsPatch({
      lastReconcileBannerDismissedAt: new Date().toISOString(),
      lastReconcileBannerDismissedOverflow: getPlanViolationOverflow(planValidation),
    });
  }, [persistPrefsPatch, planValidation]);

  const handleApplyRebalance = useCallback(async () => {
    if (!rebalancePreview?.rows.length) return;

    for (const categoryId of rebalancePreview.deleteCategoryIds ?? []) {
      await deleteCategory(categoryId);
    }

    const nextCategories = applyRebalancePreview(cycleCategories, rebalancePreview);
    for (const row of rebalancePreview.rows) {
      if (row.kind === "deleted") continue;
      const updated = nextCategories.find((c) => c.id === row.categoryId);
      if (updated) {
        await updateCategoryLimit(row.categoryId, updated.limitAmount);
      }
    }
    trackBudgetReconcileApplied({ method: "auto" });
    setShowReconcileSheet(false);
    setShowRebalancePreview(false);
    setRebalancePreview(null);
    await reload();
  }, [cycleCategories, deleteCategory, rebalancePreview, reload, updateCategoryLimit]);

  const handleBalanceForMe = useCallback(async () => {
    if (!planValidation || !user?.id) return;
    setRebalanceLoading(true);
    try {
      let preview = buildRebalancePreview(
        cycleCategories,
        planValidation,
        rebalanceContext,
      );

      const ai = await fetchAIRebalancePlan({
        categories: cycleCategories,
        validation: planValidation,
        context: rebalanceContext,
        lockedCategoryIds: preview.lockedCategoryIds,
        proposedByCategoryId: preview.proposedByCategoryId,
        mergeIntoWinner: preview.mergeIntoWinner,
      });

      if (ai) {
        preview = mergeAIRebalancePreview(
          cycleCategories,
          preview,
          ai,
          preview.lockedCategoryIds,
        );
      } else if (preview.totalAfter > preview.takeHome + 0.01) {
        preview = {
          ...preview,
          note:
            (preview.note ? preview.note + " " : "") +
            "AI refinement unavailable — showing weighted plan from your recurring bills.",
        };
      }

      setRebalancePreview(preview);
      setShowRebalancePreview(true);
    } finally {
      setRebalanceLoading(false);
    }
  }, [
    cycleCategories,
    planValidation,
    rebalanceContext,
    user?.id,
  ]);

  const handleOpenReconcileSheet = useCallback(
    (source: "categories" | "budget" | "edit") => {
      trackBudgetReconcileShown({ source });
      setShowReconcileSheet(true);
    },
    [],
  );

  const handleOpenNwsAdjust = useCallback(() => {
    setShowAllocationExceededModal(false);
    setShowNwsAdjustSheet(true);
  }, []);

  const handleApplyNwsAdjust = useCallback(
    async (needsPct: number, wantsPct: number, savingsPct: number) => {
      if (!activeCycle) return;
      await updateCycleAllocation(activeCycle.id, {
        needsPct,
        wantsPct,
        savingsPct,
      });
      await recalculateBudget();
      trackBudgetReconcileApplied({ method: "split_adjust" });
      setShowNwsAdjustSheet(false);
      setShowReconcileSheet(false);
      await reload();
    },
    [activeCycle, recalculateBudget, reload, updateCycleAllocation],
  );

  const handleAssignUnassignedToSavings = useCallback(async () => {
    if (!planValidation || planValidation.unassigned <= 0) return;
    const savingsCat = cycleCategories.find((c) => c.bucket === "savings");
    if (!savingsCat) return;
    const nextLimit = savingsCat.limitAmount + planValidation.unassigned;
    await updateCategoryLimit(savingsCat.id, nextLimit);
    trackBudgetUnassignedSlack({ amount: planValidation.unassigned });
    await reload();
  }, [cycleCategories, planValidation, reload, updateCategoryLimit]);

  const handleDismissUnassignedNudge = useCallback(async () => {
    await persistPrefsPatch({
      lastUnassignedNudgeDismissedAt: new Date().toISOString(),
    });
  }, [persistPrefsPatch]);

  const handleDismissAssignRemaining = useCallback(async () => {
    if (!activeCycleId) return;
    await persistPrefsPatch({
      assignRemainingSavingsDismissedForCycleId: activeCycleId,
    });
  }, [activeCycleId, persistPrefsPatch]);

  const handleTrimFromAllocationModal = useCallback(() => {
    setShowAllocationExceededModal(false);
    handleOpenReconcileSheet("edit");
    void handleBalanceForMe();
  }, [handleBalanceForMe, handleOpenReconcileSheet]);

  useEffect(() => {
    if (isSurvivalMode) {
      setShowSurvivalSheet(true);
    }
  }, [isSurvivalMode]);

  const proceedPendingCategoryAction = useCallback(async () => {
    if (!pendingCategoryAction) return;
    if (pendingCategoryAction.type === "add") {
      await addCategory(pendingCategoryAction.params);
    } else {
      await updateCategoryLimit(
        pendingCategoryAction.id,
        pendingCategoryAction.nextLimit,
        pendingCategoryAction.icon,
      );
    }
    setPendingCategoryAction(null);
    setAllocationExceededResult(null);
    setShowAllocationExceededModal(false);
    setShowFlexibleOverNetAck(false);
    await syncNow();
    await reload();
  }, [addCategory, pendingCategoryAction, reload, syncNow, updateCategoryLimit]);

  const autoApplyRollover = useCallback(
    async (preview: NonNullable<ReturnType<typeof computeNewCyclePreview>>) => {
      if (
        preview.savingsCategories.length === 0 ||
        preview.rollover.savings <= 0
      ) {
        await createNewCycleImmediate();
        await reload();
        return;
      }
      const destinationId = preview.savingsCategories[0].id;
      await createNewCycleFromPreview(preview, {
        [destinationId]: preview.rollover.savings,
      });
      await reload();
    },
    [createNewCycleFromPreview, createNewCycleImmediate, reload],
  );

  const handleStartNewCycle = useCallback(async () => {
    // Check for deficit before rollover: if active cycle overspent and not yet resolved, show deficit prompt first
    if (activeCycle && totals && user?.id && totals.monthlyNetIncome > 0) {
      const deficit = computeCycleDeficit({
        cycleId: activeCycle.id,
        transactions: state?.transactions ?? [],
        monthlyNetIncome: totals.monthlyNetIncome,
        budgetBaseline: totals.disposableIncome,
      });
      if (deficit) {
        const existing = await getResolutionForCycle(user.id, activeCycle.id);
        if (!existing) {
          const cycleLabel = `${activeCycle.startDate} – ${activeCycle.endDate}`;
          setPendingDeficit({
            cycleId: activeCycle.id,
            cycleLabel,
            deficitAmount: deficit.deficitAmount,
          });
          return;
        }
      }
    }

    const preview = computeNewCyclePreview();
    if (!preview) {
      await createNewCycleImmediate();
      await reload();
      return;
    }
    if (budgetEngineMode === "auto_apply_safe_rules") {
      await autoApplyRollover(preview);
      return;
    }
    setPendingRollover(preview);
  }, [
    activeCycle,
    totals,
    state?.transactions,
    user?.id,
    budgetEngineMode,
    computeNewCyclePreview,
    createNewCycleImmediate,
    autoApplyRollover,
    reload,
  ]);

  const handleRolloverConfirm = useCallback(
    async (
      allocations: Record<string, number>,
      overrides?: {
        durationDays?: number;
        durationMonths?: number;
        paydayDay?: number;
      },
    ) => {
      if (!pendingRollover) return;
      await createNewCycleFromPreview(pendingRollover, allocations, overrides);
      setPendingRollover(null);
      await reload();
    },
    [pendingRollover, createNewCycleFromPreview, reload],
  );

  const handleDeficitResolve = useCallback(
    async (choice: CycleDeficitResolutionChoice) => {
      if (!pendingDeficit || !user?.id) return;
      if (choice === "financed") {
        setPendingAddDebtFromDeficit({
          cycleId: pendingDeficit.cycleId,
          cycleLabel: pendingDeficit.cycleLabel,
          deficitAmount: pendingDeficit.deficitAmount,
        });
        setPendingDeficit(null);
        return;
      }
      await saveDeficitResolution(user.id, {
        cycleId: pendingDeficit.cycleId,
        choice,
        debtId: null,
      });
      setPendingDeficit(null);
      const preview = computeNewCyclePreview();
      if (!preview) {
        await createNewCycleImmediate();
        await reload();
        return;
      }
      if (budgetEngineMode === "auto_apply_safe_rules") {
        await autoApplyRollover(preview);
        return;
      }
      setPendingRollover(preview);
    },
    [
      pendingDeficit,
      user?.id,
      budgetEngineMode,
      computeNewCyclePreview,
      createNewCycleImmediate,
      autoApplyRollover,
      reload,
    ],
  );

  const handleCloseDeficitModal = useCallback(() => {
    setPendingDeficit(null);
  }, []);

  const handleAddDebtFromDeficitSubmit = useCallback(
    async (params: {
      name: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyPayment: number;
      interestRate?: number | null;
      sourceCycleId?: string | null;
    }) => {
      if (!pendingAddDebtFromDeficit || !user?.id) return;
      await addDebt({
        ...params,
        sourceCycleId: pendingAddDebtFromDeficit.cycleId,
      });
      await saveDeficitResolution(user.id, {
        cycleId: pendingAddDebtFromDeficit.cycleId,
        choice: "financed",
        debtId: null,
      });
      setPendingAddDebtFromDeficit(null);
      const preview = computeNewCyclePreview();
      if (!preview) {
        await createNewCycleImmediate();
        await reload();
        return;
      }
      if (budgetEngineMode === "auto_apply_safe_rules") {
        await autoApplyRollover(preview);
        return;
      }
      setPendingRollover(preview);
    },
    [
      pendingAddDebtFromDeficit,
      user?.id,
      addDebt,
      budgetEngineMode,
      computeNewCyclePreview,
      createNewCycleImmediate,
      autoApplyRollover,
      reload,
    ],
  );

  const handleCloseAddDebtFromDeficit = useCallback(() => {
    setPendingAddDebtFromDeficit(null);
  }, []);

  return {
    router,
    user,
    personalization,
    profileVitals,
    budget: {
      state,
      isLoading,
      isSyncing,
      retryIn,
      pendingCount,
      totals,
      setupBudget,
      addIncomeSource,
      updateIncomeSource,
      deleteIncomeSource,
      addTransaction,
      submitBatchTransactions,
      addCategory,
      deleteCategory,
      deleteCategories,
      updateCategoryLimit,
      updateCycleAllocation,
      updateBudgetEngineMode,
      updateBudgetEnforcement,
      updateCycleDay,
      resetBudget,
      deleteAllBudgetData,
      recalculateBudget,
      syncNow,
      reload,
    },
    refreshing,
    onRefresh,
    form: {
      paydayDay,
      setPaydayDay,
      cycleDayError,
      handlePaydayChange,
      incomeName,
      setIncomeName,
      incomeType,
      setIncomeType,
      incomeAmount,
      setIncomeAmount,
      salaryError,
      handleSalaryChange,
      applyDeductions,
      setApplyDeductions,
    },
    derived: {
      activeCycleId,
      activeCycle,
      previousCycle,
      cycleIsSet,
      cycleHasEnded,
      hasIncomeSources,
      vitalsSummary,
      allocationTitle,
      cycleCategories,
      categoriesByBucket,
      cycleTransactions,
      needsOverLimitFor,
      syncPillLabel,
      incomeAccentColors,
      incomeToggleChevronStyle,
      reallocationSuggestion,
      budgetEngineMode,
      budgetEnforcement,
      planValidation,
      showReconcileBanner,
      isSurvivalMode,
      offendingBucket,
      nwsAdjustPreview,
      showUnassignedNudge,
    },
    ui: {
      showIncomeForm,
      toggleIncomeForm,
      categoriesOpen,
      setCategoriesOpen,
      bucketOpen,
      setBucketOpen,
      spendingInsights,
      spendingInsightsLoading,
      advisorRecommendations,
      budgetHealthScore,
      pendingRollover,
      setPendingRollover,
    },
    modals: {
      showTxModal,
      setShowTxModal,
      pendingConfirm,
      setPendingConfirm,
      showNeedsOverModal,
      setShowNeedsOverModal,
      showResetConfirm,
      setShowResetConfirm,
      categoryToDelete,
      setCategoryToDelete,
      showDeleteCategoryConfirm,
      setShowDeleteCategoryConfirm,
      incomeToDelete,
      setIncomeToDelete,
      showDeleteIncomeConfirm,
      setShowDeleteIncomeConfirm,
      incomeToEdit,
      setIncomeToEdit,
      showEditIncomeModal,
      setShowEditIncomeModal,
      editingLimit,
      setEditingLimit,
      showEditLimitModal,
      setShowEditLimitModal,
      showEditCycleModal,
      setShowEditCycleModal,
      showAddCustomCategoryModal,
      setShowAddCustomCategoryModal,
      allocationExceededResult,
      showAllocationExceededModal,
      setShowAllocationExceededModal,
      onConfirmAllocationExceeded,
      onConfirmFlexibleOverNet,
      handleCloseAllocationExceeded,
      showFlexibleOverNetAck,
      showReconcileSheet,
      setShowReconcileSheet,
      showRebalancePreview,
      setShowRebalancePreview,
      rebalancePreview,
      rebalanceLoading,
      handleApplyRebalance,
      handleBalanceForMe,
      handleDismissReconcileSheet,
      handleCloseReconcileSheet,
      handleDismissReconcileBanner,
      handleOpenReconcileSheet,
      handleOpenNwsAdjust,
      handleApplyNwsAdjust,
      handleTrimFromAllocationModal,
      handleAssignUnassignedToSavings,
      handleDismissUnassignedNudge,
      handleDismissAssignRemaining,
      showNwsAdjustSheet,
      setShowNwsAdjustSheet,
      showSurvivalSheet,
      setShowSurvivalSheet,
      handleAddCategory,
      handleUpdateCategoryLimit,
      handleStartNewCycle,
      handleRolloverConfirm,
      pendingDeficit,
      showDeficitModal: !!pendingDeficit,
      handleDeficitResolve,
      handleCloseDeficitModal,
      pendingAddDebtFromDeficit,
      showAddDebtFromDeficitModal: !!pendingAddDebtFromDeficit,
      handleAddDebtFromDeficitSubmit,
      handleCloseAddDebtFromDeficit,
    },
  };
}
