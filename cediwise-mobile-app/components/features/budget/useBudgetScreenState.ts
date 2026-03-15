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
import type { BudgetBucket } from "../../../types/budget";
import { checkCategoryLimitImpact } from "../../../utils/allocationExceeded";
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
import { supabase } from "../../../utils/supabase";
import { DEFAULT_MIN_LIVING_BUFFER } from "../vitals/utils";

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
    addCategory,
    deleteCategory,
    deleteCategories,
    updateCategoryLimit,
    updateCycleDay,
    updateCycleAllocation,
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
  const [applyDeductions, setApplyDeductions] = useState(true);

  const [filter, setFilter] = useState<"all" | BudgetBucket>("all");
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
  const [spendingInsightsLoading, setSpendingInsightsLoading] = useState(false);
  const [enableAutoReallocation, setEnableAutoReallocation] = useState(true);

  const fetchEnableAutoReallocation = useCallback(async () => {
    if (!user?.id || !supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("enable_auto_reallocation")
      .eq("id", user.id)
      .maybeSingle();
    if (data && typeof (data as any).enable_auto_reallocation === "boolean") {
      setEnableAutoReallocation((data as any).enable_auto_reallocation);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchEnableAutoReallocation();
  }, [fetchEnableAutoReallocation]);

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

  const previousCycle = useMemo(() => {
    const sorted = [...(state?.cycles ?? [])].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    return sorted[1] ?? null;
  }, [state?.cycles]);

  const reallocationSuggestion = useMemo((): ReallocationSuggestion | null => {
    if (!previousCycle) {
      if (__DEV__ && (state?.cycles?.length ?? 0) >= 1) {
        console.log(
          "[Reallocation] No previous cycle – need at least 2 cycles",
        );
      }
      return null;
    }
    if (!totals || totals.monthlyNetIncome <= 0) {
      if (__DEV__) {
        console.log(
          "[Reallocation] No income – monthlyNetIncome:",
          totals?.monthlyNetIncome ?? 0,
        );
      }
      return null;
    }
    if (!state?.transactions?.length) {
      if (__DEV__) {
        console.log("[Reallocation] No transactions in state");
      }
      return null;
    }
    if (activeCycle?.reallocationApplied) {
      if (__DEV__) console.log("[Reallocation] Already applied for this cycle");
      return null;
    }
    const prevTxCount = state.transactions.filter(
      (t) => t.cycleId === previousCycle.id,
    ).length;
    if (prevTxCount === 0 && __DEV__) {
      console.log("[Reallocation] Previous cycle has no transactions");
    }
    const suggestion = analyzeAndSuggestReallocation(
      previousCycle,
      state.transactions,
      totals.monthlyNetIncome,
    );
    if (__DEV__ && !suggestion.shouldReallocate) {
      console.log(
        "[Reallocation] Engine returned shouldReallocate=false (need both >8% overspend and >12% underspend by bucket)",
      );
    }
    return suggestion.shouldReallocate ? suggestion : null;
  }, [
    previousCycle,
    totals,
    state?.transactions,
    activeCycle?.reallocationApplied,
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
      ? computeGhanaTax2026Monthly(v.stable_salary).netTakeHome
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
  }, [profileVitals.vitals]);

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
    const tx = state.transactions.filter((t) => t.cycleId === activeCycleId);
    if (filter === "all") return tx;
    return tx.filter((t) => t.bucket === filter);
  }, [activeCycleId, filter, state]);

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
              if (totalAllocated > totals.monthlyNetIncome * 1.1) {
                allocationHints.push(
                  "You're allocating more than your income. Adjust allocations to stay within budget.",
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
        : "Syncing…";

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
      await fetchEnableAutoReallocation(); // Fetch the enable auto reallocation setting
      await reload(); // Reload the budget state
      await recalculateBudget(); // Recalculate the budget
    } catch {
      // ignore
    } finally {
      // Ensure spinner is visible for at least 500ms so users see feedback
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      setRefreshing(false);
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
      icon?: import("../../../constants/categoryIcons").CategoryIconName
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
    if (allocationExceededResult.suggestedAllocation && activeCycle) {
      await updateCycleAllocation(
        activeCycle.id,
        allocationExceededResult.suggestedAllocation,
      );
    }
    // Debt is no longer auto-created from allocation overrun.
    // Overspend → debt flow is expense-triggered (deficit prompt at rollover).
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
    await syncNow();
    await reload();
  }, [
    activeCycle,
    allocationExceededResult,
    pendingCategoryAction,
    addCategory,
    updateCategoryLimit,
    updateCycleAllocation,
    syncNow,
    reload,
  ]);

  const handleCloseAllocationExceeded = useCallback(() => {
    setShowAllocationExceededModal(false);
    setAllocationExceededResult(null);
    setPendingCategoryAction(null);
  }, []);

  const handleStartNewCycle = useCallback(async () => {
    // Check for deficit before rollover: if active cycle overspent and not yet resolved, show deficit prompt first
    if (
      activeCycle &&
      totals &&
      user?.id &&
      totals.monthlyNetIncome > 0
    ) {
      const totalSpent =
        totals.spentByBucket.needs +
        totals.spentByBucket.wants +
        totals.spentByBucket.savings;
      const deficit = computeCycleDeficit({
        cycleId: activeCycle.id,
        transactions: state?.transactions ?? [],
        monthlyNetIncome: totals.monthlyNetIncome,
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
    setPendingRollover(preview);
  }, [
    activeCycle,
    totals,
    state?.transactions,
    user?.id,
    computeNewCyclePreview,
    createNewCycleImmediate,
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
      setPendingRollover(preview);
    },
    [
      pendingDeficit,
      user?.id,
      computeNewCyclePreview,
      createNewCycleImmediate,
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
      setPendingRollover(preview);
    },
    [
      pendingAddDebtFromDeficit,
      user?.id,
      addDebt,
      computeNewCyclePreview,
      createNewCycleImmediate,
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
      addCategory,
      deleteCategory,
      deleteCategories,
      updateCategoryLimit,
      updateCycleAllocation,
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
      enableAutoReallocation,
    },
    ui: {
      filter,
      setFilter,
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
      handleCloseAllocationExceeded,
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
