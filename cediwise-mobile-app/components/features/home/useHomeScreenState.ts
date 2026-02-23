import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "../../../hooks/useAuth";
import { useBudget } from "../../../hooks/useBudget";
import { useProfileVitals } from "../../../hooks/useProfileVitals";
import type {
  BudgetCategory,
  BudgetState,
  BudgetTransaction,
} from "../../../types/budget";
import { computeGhanaTax2026Monthly } from "../../../utils/ghanaTax";
import type { BudgetTotals, IncomeTaxSummary } from "./types";

/** User shape from auth (matches useAuth stored user). */
export type HomeScreenUser = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  lastLogin: string;
} | null;

export interface UseHomeScreenStateReturn {
  // Auth / user
  user: HomeScreenUser;
  headerTitle: string;
  headerSubtitle: string;
  authLoading: boolean;
  /** True while auth or initial profile/budget load; show VitalHeroSkeleton when true. */
  isHomeLoading: boolean;
  /** True when user has completed vitals setup (profile + cycle). */
  setupCompleted: boolean;
  handleProfilePress: () => void;

  // Budget
  budgetState: BudgetState | null;
  budgetTotals: BudgetTotals | null;
  showBudgetSnapshot: boolean;
  activeCycleId: string | null;
  cycleCategories: BudgetCategory[];
  recentExpenses: BudgetTransaction[];
  addTransaction: (params: {
    amount: number;
    note?: string;
    bucket: "needs" | "wants" | "savings";
    categoryId?: string | null;
  }) => Promise<{ wouldExceedNeeds?: boolean }>;

  // Income / salary
  incomeTaxSummary: IncomeTaxSummary;
  salary: string;
  setSalary: (value: string) => void;
  estimateTaxEnabled: boolean;
  setEstimateTaxEnabled: (
    value: boolean | ((prev: boolean) => boolean)
  ) => void;
  vitalsSnapshot: {
    stable_salary?: number;
    auto_tax?: boolean;
    setup_completed?: boolean;
  } | null;

  // Refresh
  refreshing: boolean;
  handleRefresh: () => Promise<void>;

  // Expense modal
  showExpenseModal: boolean;
  setShowExpenseModal: (value: boolean) => void;

  // Animations
  overviewAnimStyle: ReturnType<typeof useAnimatedStyle>;
  salaryAnimStyle: ReturnType<typeof useAnimatedStyle>;
  ledgerAnimStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useHomeScreenState(): UseHomeScreenStateReturn {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const profileVitals = useProfileVitals(user?.id);
  const {
    state: budgetState,
    totals: budgetTotals,
    addTransaction,
    syncNow,
    hydrateFromRemote,
    reload,
  } = useBudget(user?.id);

  const [salary, setSalary] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [estimateTaxEnabled, setEstimateTaxEnabled] = useState(true);
  const didHydrateRef = useRef(false);

  const overviewAnim = useSharedValue(0);
  const salaryAnim = useSharedValue(0);
  const ledgerAnim = useSharedValue(0);

  useEffect(() => {
    if (!user?.id) return;
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    void hydrateFromRemote();
    void profileVitals.refresh();
  }, [hydrateFromRemote, profileVitals, user?.id]);

  const activeCycleId = useMemo(() => {
    const sorted = [...(budgetState?.cycles ?? [])].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    return sorted[0]?.id ?? null;
  }, [budgetState?.cycles]);

  const cycleCategories = useMemo(() => {
    if (!budgetState || !activeCycleId) return [];
    return budgetState.categories.filter((c) => c.cycleId === activeCycleId);
  }, [activeCycleId, budgetState]);

  const recentExpenses = useMemo(() => {
    if (!budgetState || !activeCycleId) return [];
    return [...budgetState.transactions]
      .filter((t) => t.cycleId === activeCycleId)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )
      .slice(0, 6);
  }, [activeCycleId, budgetState]);

  const incomeSources = useMemo(
    () => budgetState?.incomeSources ?? [],
    [budgetState?.incomeSources]
  );

  useEffect(() => {
    const v = profileVitals.vitals;
    if (v?.setup_completed) {
      setEstimateTaxEnabled(v.auto_tax);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVitals.vitals?.setup_completed]);

  const incomeMode = useMemo(() => {
    if (incomeSources.length > 0) return "sources" as const;
    const v = profileVitals.vitals;
    if (v?.setup_completed && (v.stable_salary ?? 0) > 0)
      return "vitals" as const;
    return "manual" as const;
  }, [incomeSources.length, profileVitals.vitals]);

  const incomeTaxSummary = useMemo((): IncomeTaxSummary => {
    if (incomeMode === "sources") {
      const gross = incomeSources.reduce((s, src) => s + (src.amount ?? 0), 0);
      const breakdowns = incomeSources.map((src) => {
        const taxable =
          estimateTaxEnabled && src.type === "primary" && !!src.applyDeductions;
        const tax = taxable
          ? computeGhanaTax2026Monthly(src.amount)
          : { ssnit: 0, paye: 0, netTakeHome: src.amount };
        return { src, taxable, tax };
      });
      const totalSsnit = breakdowns.reduce((s, b) => s + b.tax.ssnit, 0);
      const totalPaye = breakdowns.reduce((s, b) => s + b.tax.paye, 0);
      const net = estimateTaxEnabled
        ? budgetTotals?.monthlyNetIncome ??
          breakdowns.reduce((s, b) => s + b.tax.netTakeHome, 0)
        : gross;
      const deductions = estimateTaxEnabled ? totalSsnit + totalPaye : 0;
      return {
        mode: "sources",
        gross,
        net,
        deductions,
        totalSsnit,
        totalPaye,
        breakdowns,
      };
    }

    const v = profileVitals.vitals;
    const gross =
      incomeMode === "vitals" ? v?.stable_salary ?? 0 : parseFloat(salary) || 0;
    const applyTax =
      estimateTaxEnabled && (incomeMode === "manual" ? true : !!v?.auto_tax);
    const base = computeGhanaTax2026Monthly(gross);
    const ssnit = applyTax ? base.ssnit : 0;
    const paye = applyTax ? base.paye : 0;
    const netTakeHome = applyTax ? base.netTakeHome : gross;
    return {
      mode: incomeMode,
      gross,
      net: netTakeHome,
      deductions: ssnit + paye,
      totalSsnit: ssnit,
      totalPaye: paye,
      breakdowns: [],
    };
  }, [
    budgetTotals?.monthlyNetIncome,
    estimateTaxEnabled,
    incomeMode,
    incomeSources,
    profileVitals.vitals,
    salary,
  ]);

  useEffect(() => {
    overviewAnim.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    const t1 = setTimeout(() => {
      salaryAnim.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }, 50);
    const t2 = setTimeout(() => {
      ledgerAnim.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }, 100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [overviewAnim, salaryAnim, ledgerAnim]);

  const overviewAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overviewAnim.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(
          overviewAnim.value,
          [0, 1],
          [20, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const salaryAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(salaryAnim.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(
          salaryAnim.value,
          [0, 1],
          [20, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const ledgerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ledgerAnim.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(
          ledgerAnim.value,
          [0, 1],
          [20, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await syncNow();
      await hydrateFromRemote({ force: true });
      await profileVitals.refresh();
      await reload();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      setRefreshing(false);
    }
  }, [syncNow, hydrateFromRemote, profileVitals, reload]);

  const handleProfilePress = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.push("/profile");
  }, [router]);

  const headerTitle = user?.name
    ? `Welcome back, ${user.name.split(" ")[0]}`
    : "CediWise";
  const headerSubtitle = user?.email
    ? "Here's your financial overview"
    : "Here's your financial overview";

  const showBudgetSnapshot = !!(
    budgetState?.prefs?.paydayDay &&
    (budgetState?.incomeSources?.length ?? 0) > 0 &&
    budgetTotals
  );

  const isHomeLoading = authLoading || profileVitals.isLoading;
  const setupCompleted = profileVitals.vitals?.setup_completed ?? true;

  return {
    user: user ?? null,
    headerTitle,
    headerSubtitle,
    authLoading,
    isHomeLoading,
    setupCompleted,
    handleProfilePress,
    budgetState,
    budgetTotals,
    showBudgetSnapshot,
    activeCycleId,
    cycleCategories,
    recentExpenses,
    addTransaction,
    incomeTaxSummary,
    salary,
    setSalary,
    estimateTaxEnabled,
    setEstimateTaxEnabled,
    vitalsSnapshot: profileVitals.vitals,
    refreshing,
    handleRefresh,
    showExpenseModal,
    setShowExpenseModal,
    overviewAnimStyle,
    salaryAnimStyle,
    ledgerAnimStyle,
  };
}
