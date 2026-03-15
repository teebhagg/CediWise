import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useBudgetStore } from "../stores/budgetStore";
import { usePersonalizationStore } from "../stores/personalizationStore";
import { useProfileVitalsStore } from "../stores/profileVitalsStore";

import {
  computeWeightedCategoryLimits,
  type CategoryLimitInput,
} from "../calculators/category-weights";
import type {
  BudgetBucket,
  BudgetCategory,
  BudgetCycle,
  BudgetMutation,
  BudgetQueue,
  BudgetState,
  BudgetTransaction,
  IncomeSource,
  IncomeSourceType,
} from "../types/budget";
import { logActivity } from "../utils/activityLog";
import {
  blendAllocation,
  getHistoricalAvgByCategory,
} from "../utils/allocationBlending";
import { hydrateBudgetStateFromRemote } from "../utils/budgetHydrate";
import { recalculateBudgetFromAllocations } from "../utils/budgetRecalc";
import {
  clearBudgetLocal,
  createEmptyBudgetState,
  enqueueMutation,
  loadBudgetQueue,
  loadBudgetState,
  saveBudgetState,
} from "../utils/budgetStorage";
import {
  clearProfileVitalsCache,
  writePersonalizationStatusCache,
} from "../utils/profileVitals";
import {
  flushBudgetQueue,
  syncCycleDirect,
  trySyncMutation,
} from "../utils/budgetSync";
import { getMonthlyNetIncome } from "../utils/incomeCalculations";
import { calculateRollover } from "../utils/reallocationEngine";
import { uuidv4 } from "../utils/uuid";

function makeQueueId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function lastDayOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function paydayDateForMonth(base: Date, paydayDay: number) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = Math.min(Math.max(1, paydayDay), lastDayOfMonth(year, month));
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function computePaydayCycle(today: Date, paydayDay: number) {
  const thisMonthPayday = paydayDateForMonth(today, paydayDay);
  const start =
    today.getTime() >= thisMonthPayday.getTime()
      ? thisMonthPayday
      : paydayDateForMonth(
          new Date(today.getFullYear(), today.getMonth() - 1, 15),
          paydayDay
        );
  const nextPayday = paydayDateForMonth(
    new Date(start.getFullYear(), start.getMonth() + 1, 15),
    paydayDay
  );
  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = lastDayOfMonth(result.getFullYear(), result.getMonth());
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Compute next cycle from previous: start = prevEnd + 1, same duration as prev.
 * Weekly/bi-weekly use days; monthly+ use calendar months.
 */
function computeNextCycleFromPrevious(
  prevStartDate: string,
  prevEndDate: string,
  useMonths: boolean
): { start: Date; end: Date } {
  const prevStart = new Date(prevStartDate);
  const prevEnd = new Date(prevEndDate);

  const newStart = new Date(prevEnd);
  newStart.setDate(newStart.getDate() + 1);

  if (useMonths) {
    const durationDays =
      Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1;
    const durationMonths = Math.max(1, Math.round(durationDays / 30.44));
    const periodEnd = addMonths(newStart, durationMonths);
    periodEnd.setDate(periodEnd.getDate() - 1);
    return { start: newStart, end: periodEnd };
  }

  const durationDays =
    Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1;
  const newEnd = new Date(newStart);
  newEnd.setDate(newEnd.getDate() + durationDays - 1);
  return { start: newStart, end: newEnd };
}

function categoryToPayload(cat: BudgetCategory): Record<string, unknown> {
  return {
    id: cat.id,
    user_id: cat.userId,
    cycle_id: cat.cycleId,
    bucket: cat.bucket,
    name: cat.name,
    icon: cat.icon ?? null,
    limit_amount: cat.limitAmount,
    is_custom: cat.isCustom ?? false,
    parent_id: cat.parentId ?? null,
    sort_order: cat.sortOrder ?? 0,
    suggested_limit: cat.suggestedLimit ?? null,
    is_archived: cat.isArchived ?? false,
    manual_override: cat.manualOverride ?? false,
  };
}

function seedCategories(interests?: string[]) {
  // NOTE: Keep categories small + stable; budgets are edited frequently on mobile.
  // Wants are the main personalization surface (based on interests).
  const wantsFromInterests = (interests?: string[]) => {
    const base = ["Data Bundles"] as string[];
    const map: Record<string, string[]> = {
      Tech: ["Subscriptions", "Gadgets"],
      Fashion: ["Clothing", "Shoes & Accessories"],
      Fitness: ["Gym", "Supplements"],
      Food: ["Dining Out"],
      Travel: ["Travel"],
      Gaming: ["Games"],
      Music: ["Entertainment"],
      Business: ["Skills & Courses"],
      Beauty: ["Self-care"],
    };

    const picked: string[] = [];
    for (const interest of interests ?? []) {
      const items = map[String(interest)];
      if (!items) continue;
      for (const it of items) picked.push(it);
    }

    // Fill with sensible defaults if no/low interest signal.
    const fallbacks = ["Dining Out", "Clothing", "Hobbies"] as const;
    const out = [...base, ...picked, ...fallbacks];
    const uniq: string[] = [];
    for (const name of out) {
      const normalized = name.trim();
      if (!normalized) continue;
      if (!uniq.includes(normalized)) uniq.push(normalized);
    }
    return uniq.slice(0, 5);
  };

  return {
    // Utilities live under Needs for v1.
    needs: [
      "Rent",
      "School Fees",
      "Transport",
      "Groceries",
      "Tithes/Church",
      "ECG",
      "Ghana Water",
      "Trash",
    ],
    wants: wantsFromInterests(interests),
    savings: ["Emergency Fund", "Susu/Project Savings", "T-Bills"],
  } satisfies Record<BudgetBucket, string[]>;
}

export type UseBudgetReturn = {
  state: BudgetState | null;
  queue: BudgetQueue | null;
  isLoading: boolean;
  /** True from sync run start until the last item in the current pass is attempted (UI updates only on this boundary). */
  isSyncing: boolean;
  /** Set when a sync run has just ended; consumer can show a toast then call clearSyncRunResult(). */
  lastSyncRunEndedAt: number | null;
  clearSyncRunResult: () => void;
  retryIn: number | null;
  pendingCount: number;
  cycle: { startDate: string; endDate: string } | null;
  activeCycle: BudgetCycle | null;
  totals: {
    monthlyNetIncome: number;
    needsLimit: number;
    wantsLimit: number;
    savingsLimit: number;
    spentByBucket: Record<BudgetBucket, number>;
  } | null;
  setupBudget: (params: {
    paydayDay: number;
    needsPct?: number;
    wantsPct?: number;
    savingsPct?: number;
    interests?: string[];
    seedCategories?: boolean;
    /** Fixed amounts from vitals (e.g. Rent, ECG) for obligation-first allocation */
    fixedAmountsByCategory?: Record<string, number>;
    lifeStage?: "student" | "young_professional" | "family" | "retiree" | null;
  }) => Promise<void>;
  computeNewCyclePreview: () => {
    rollover: { needs: number; wants: number; savings: number };
    savingsCategories: { id: string; name: string }[];
    nextCycleStart: string;
    nextCycleEnd: string;
    durationDays: number;
    durationUnit: "days" | "months";
    durationMonths?: number;
    paydayDay: number;
  } | null;
  createNewCycleFromPreview: (
    preview: {
      rollover: { needs: number; wants: number; savings: number };
      savingsCategories: { id: string; name: string }[];
      nextCycleStart: string;
      nextCycleEnd: string;
      durationDays: number;
      durationUnit?: "days" | "months";
      durationMonths?: number;
      paydayDay: number;
    },
    allocations: Record<string, number>,
    overrides?: {
      durationDays?: number;
      durationMonths?: number;
      paydayDay?: number;
    }
  ) => Promise<{ newCycleId: string } | null>;
  createNewCycleImmediate: () => Promise<{ newCycleId: string } | null>;
  addIncomeSource: (params: {
    name: string;
    type: IncomeSourceType;
    amount: number;
    applyDeductions: boolean;
  }) => Promise<{ syncError?: string } | void>;
  updateIncomeSource: (
    incomeSourceId: string,
    patch: {
      name: string;
      type: IncomeSourceType;
      amount: number;
      applyDeductions: boolean;
    }
  ) => Promise<{ syncError?: string } | void>;
  addTransaction: (params: {
    bucket: BudgetBucket;
    categoryId?: string | null;
    amount: number;
    note?: string;
    occurredAt?: Date;
    /** When set, marks this transaction as a payment toward a specific debt */
    debtId?: string | null;
  }) => Promise<{ wouldExceedNeeds?: boolean }>;
  updateTransaction: (
    id: string,
    updates: {
      bucket: BudgetBucket;
      categoryId?: string | null;
      amount: number;
      note?: string;
      occurredAt?: string;
    }
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteIncomeSource: (incomeSourceId: string) => Promise<{ syncError?: string } | void>;
  addCategory: (params: {
    name: string;
    bucket: BudgetBucket;
    limitAmount?: number;
    icon?: import("@/constants/categoryIcons").CategoryIconName;
  }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  /** Remove multiple categories in a single state update (avoids race when deleting many). */
  deleteCategories: (categoryIds: string[]) => Promise<void>;
  updateCategoryLimit: (
    categoryId: string,
    nextLimitAmount: number,
    icon?: import("../constants/categoryIcons").CategoryIconName
  ) => Promise<void>;
  updateCycleDay: (nextPaydayDay: number) => Promise<void>;
  updateCycleAllocation: (
    cycleId: string,
    allocation: { needsPct: number; wantsPct: number; savingsPct: number },
    options?: { reallocationReason?: string }
  ) => Promise<void>;
  applyTemplate: (
    cycleId: string,
    allocation: { needsPct: number; wantsPct: number; savingsPct: number }
  ) => Promise<void>;
  insertDebt: (params: {
    name: string;
    totalAmount: number;
    remainingAmount: number;
    monthlyPayment: number;
  }) => Promise<void>;
  resetBudget: () => Promise<void>;
  /** Delete all budget data on server then clear local; optionally clear profile (payday, interests). */
  deleteAllBudgetData: (removeProfile: boolean) => Promise<void>;
  syncNow: () => Promise<void>;
  hydrateFromRemote: (options?: { force?: boolean }) => Promise<void>;
  recalculateBudget: (overrideState?: BudgetState) => Promise<void>;
  retryMutation: (id: string) => Promise<void>;
  clearLocal: () => Promise<void>;
  reload: () => Promise<void>;
};

export function useBudget(userId?: string | null): UseBudgetReturn {
  const store = useBudgetStore();
  const {
    state,
    queue,
    isLoading,
    isSyncing,
    lastSyncRunEndedAt,
    retryIn,
  } = store;
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSyncRunResult = useCallback(() => {
    useBudgetStore.getState().clearSyncRunResult();
  }, []);

  const cancelScheduledRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    useBudgetStore.getState().setRetryIn(null);
  }, []);

  useEffect(() => {
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  const reload = useCallback(async () => {
    await useBudgetStore.getState().reload();
  }, []);

  useEffect(() => {
    void useBudgetStore.getState().initForUser(userId ?? null);
  }, [userId]);

  const pendingCount = queue?.items.length ?? 0;

  const activeCycle: BudgetCycle | null = useMemo(() => {
    if (!state) return null;
    // Prefer most recent cycle (by start_date)
    const sorted = [...state.cycles].sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    return sorted[0] ?? null;
  }, [state]);

  const cycle = useMemo(() => {
    if (!state?.prefs?.paydayDay) return null;
    const { start, end } = computePaydayCycle(
      new Date(),
      state.prefs.paydayDay
    );
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }, [state?.prefs?.paydayDay]);

  const totals = useMemo(() => {
    if (!state || !activeCycle) return null;

    const monthlyNetIncome = getMonthlyNetIncome(state.incomeSources);

    const needsLimit = monthlyNetIncome * activeCycle.needsPct;
    const wantsLimit = monthlyNetIncome * activeCycle.wantsPct;
    const savingsLimit = monthlyNetIncome * activeCycle.savingsPct;

    const txs = state.transactions.filter((t) => t.cycleId === activeCycle.id);
    const spentByBucket: Record<BudgetBucket, number> = {
      needs: 0,
      wants: 0,
      savings: 0,
    };
    for (const t of txs) {
      // Back-compat: older local/remote data may still have utilities bucket.
      const bucket = (t.bucket as any) === "utilities" ? "needs" : t.bucket;
      spentByBucket[bucket] += t.amount;
    }

    return {
      monthlyNetIncome,
      needsLimit,
      wantsLimit,
      savingsLimit,
      spentByBucket,
    };
  }, [state, activeCycle]);

  const persistState = useCallback(async (next: BudgetState) => {
    await useBudgetStore.getState().persistState(next);
  }, []);

  const refreshQueue = useCallback(async () => {
    await useBudgetStore.getState().refreshQueue();
  }, []);

  const enqueueAndTry = useCallback(
    async (mutation: Omit<BudgetMutation, "retryCount">) => {
      if (!userId) return;
      const queued = await enqueueMutation(userId, mutation);
      await refreshQueue();

      // Attempt immediately
      const result = await trySyncMutation(userId, queued);
      await refreshQueue();
      return result;
    },
    [refreshQueue, userId]
  );

  const setupBudget = useCallback(
    async ({
      paydayDay,
      needsPct = 0.5,
      wantsPct = 0.3,
      savingsPct = 0.2,
      interests,
      seedCategories: shouldSeedCategories = true,
      fixedAmountsByCategory,
      lifeStage,
    }: {
      paydayDay: number;
      needsPct?: number;
      wantsPct?: number;
      savingsPct?: number;
      interests?: string[];
      seedCategories?: boolean;
      fixedAmountsByCategory?: Record<string, number>;
      lifeStage?:
        | "student"
        | "young_professional"
        | "family"
        | "retiree"
        | null;
    }) => {
      if (!userId) return;
      const latestState = await loadBudgetState(userId);
      const current = latestState ?? state ?? createEmptyBudgetState(userId);
      const now = new Date();
      const { start, end } = computePaydayCycle(now, paydayDay);

      const cycleId = uuidv4();
      const createdAt = new Date().toISOString();
      const cycle: BudgetCycle = {
        id: cycleId,
        userId,
        startDate: toISODate(start),
        endDate: toISODate(end),
        paydayDay,
        needsPct,
        wantsPct,
        savingsPct,
        rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
        reallocationApplied: false,
        createdAt,
        updatedAt: createdAt,
      };

      let allNames: { bucket: BudgetBucket; name: string }[] = [];
      let needsList: string[] = [];
      let seeded:
        | ReturnType<typeof seedCategories>
        | null = null;
      if (shouldSeedCategories) {
        seeded = seedCategories(interests ?? current.prefs?.interests);
        needsList = [...seeded.needs];
        if (
          fixedAmountsByCategory?.["Debt Payments"] &&
          !needsList.includes("Debt Payments")
        ) {
          needsList.push("Debt Payments");
        }
        allNames = [
          ...needsList.map((name) => ({ bucket: "needs" as const, name })),
          ...seeded.wants.map((name) => ({ bucket: "wants" as const, name })),
          ...seeded.savings.map((name) => ({ bucket: "savings" as const, name })),
        ];
      }

      const monthlyNetIncome = getMonthlyNetIncome(current.incomeSources);
      const bucketTotals: Record<BudgetBucket, number> = {
        needs: monthlyNetIncome * needsPct,
        wants: monthlyNetIncome * wantsPct,
        savings: monthlyNetIncome * savingsPct,
      };

      const limitByKey = new Map<string, number>();
      const historical = getHistoricalAvgByCategory(current);

      for (const bucket of ["needs", "wants", "savings"] as const) {
        if (!seeded) break;
        const names =
          bucket === "needs"
            ? needsList
            : bucket === "wants"
            ? seeded.wants
            : seeded.savings;
        const inputs: CategoryLimitInput[] = names.map((name) => ({
          name,
          bucket,
          fixedAmount: fixedAmountsByCategory?.[name],
          manualOverride: false,
        }));
        const limits = computeWeightedCategoryLimits(
          bucketTotals[bucket],
          inputs,
          lifeStage ?? null
        );
        limits.forEach((templateLimit, name) => {
          const hist = historical.get(`${bucket}:${name}`);
          const blended = blendAllocation(
            templateLimit,
            hist?.avgSpent ?? null,
            hist?.variance ?? 0,
            hist?.cycleCount ?? 0
          );
          limitByKey.set(`${bucket}:${name}`, blended);
        });
      }

      const categories: BudgetCategory[] = allNames.map(
        ({ bucket, name }, index) => {
          const limitAmount = limitByKey.get(`${bucket}:${name}`) ?? 0;
          const isFixed = (fixedAmountsByCategory?.[name] ?? 0) > 0;
          return {
            id: uuidv4(),
            userId,
            cycleId,
            bucket,
            name,
            limitAmount: Math.max(0, Math.round(limitAmount * 100) / 100),
            isCustom: false,
            parentId: null,
            sortOrder: index,
            suggestedLimit: null,
            isArchived: false,
            manualOverride: isFixed,
            createdAt,
            updatedAt: createdAt,
          };
        }
      );

      const next: BudgetState = {
        ...current,
        prefs: {
          ...current.prefs,
          paydayDay,
          ...(Array.isArray(interests) ? { interests } : {}),
          ...(lifeStage != null ? { lifeStage } : {}),
        },
        cycles: [cycle, ...current.cycles.filter((c) => c.id !== cycleId)],
        categories: [
          ...categories,
          ...current.categories.filter((c) => c.cycleId !== cycleId),
        ],
      };
      await persistState(next);

      // Queue + attempt remote writes
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt,
        kind: "upsert_profile",
        payload: {
          id: userId,
          payday_day: paydayDay,
          ...(Array.isArray(interests) ? { interests } : {}),
        },
      });
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt,
        kind: "upsert_cycle",
        payload: {
          id: cycle.id,
          user_id: userId,
          start_date: cycle.startDate,
          end_date: cycle.endDate,
          payday_day: paydayDay,
          needs_pct: needsPct,
          wants_pct: wantsPct,
          savings_pct: savingsPct,
        },
      });
      // categories
      if (shouldSeedCategories) {
        for (const cat of categories) {
          // Fire-and-forget; if offline, they stay queued
          await enqueueAndTry({
            id: makeQueueId(),
            userId,
            createdAt,
            kind: "upsert_category",
            payload: categoryToPayload(cat),
          });
        }
      }
    },
    [enqueueAndTry, persistState, state, userId]
  );

  /**
   * Compute new cycle preview (rollover + destinations + cycle options) WITHOUT creating.
   * Use this to show the modal before creation. Returns null only when no prev cycle or no income.
   */
  const computeNewCyclePreview = useCallback((): {
    rollover: { needs: number; wants: number; savings: number };
    savingsCategories: { id: string; name: string }[];
    nextCycleStart: string;
    nextCycleEnd: string;
    durationDays: number;
    durationUnit: "days" | "months";
    durationMonths?: number;
    paydayDay: number;
  } | null => {
    if (!userId) return null;
    const current = state ?? createEmptyBudgetState(userId);
    const prevCycle = activeCycle ?? current.cycles[0];
    if (!prevCycle) return null;

    const monthlyNetIncome = getMonthlyNetIncome(current.incomeSources);
    if (monthlyNetIncome <= 0) return null;

    // If total expenses for the cycle are greater than or equal to income,
    // there is no true leftover to roll over. In that case we skip the
    // rollover modal entirely and create the next cycle immediately.
    const totalSpent = current.transactions
      .filter((t) => t.cycleId === prevCycle.id)
      .reduce((sum, t) => sum + t.amount, 0);
    if (totalSpent >= monthlyNetIncome) {
      return null;
    }

    const rollover = calculateRollover(
      prevCycle,
      current.transactions,
      monthlyNetIncome
    );
    const totalRollover = rollover.needs + rollover.wants + rollover.savings;

    const prevCategories = current.categories.filter(
      (c) => c.cycleId === prevCycle.id
    );
    const savingsCats = prevCategories.filter((c) => c.bucket === "savings");
    const savingsCategories =
      totalRollover > 0 && savingsCats.length > 0
        ? savingsCats.map((c) => ({ id: uuidv4(), name: c.name }))
        : [];

    const durationDays =
      Math.round(
        (new Date(prevCycle.endDate).getTime() -
          new Date(prevCycle.startDate).getTime()) /
          86400000
      ) + 1;
    const useMonths = durationDays > 14;
    const { start, end } = computeNextCycleFromPrevious(
      prevCycle.startDate,
      prevCycle.endDate,
      useMonths
    );
    const actualDurationDays =
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const durationMonths = useMonths
      ? Math.max(1, Math.round(durationDays / 30.44))
      : undefined;

    return {
      rollover,
      savingsCategories,
      nextCycleStart: toISODate(start),
      nextCycleEnd: toISODate(end),
      durationDays: actualDurationDays,
      durationUnit: useMonths ? ("months" as const) : ("days" as const),
      durationMonths: useMonths ? durationMonths : undefined,
      paydayDay: prevCycle.paydayDay,
    };
  }, [activeCycle, state, userId]);

  /**
   * Create cycle + categories with rollover baked into savings limits.
   * Call this after user confirms in the modal.
   * overrides.durationDays and overrides.paydayDay let the user edit before creating.
   */
  const createNewCycleFromPreview = useCallback(
    async (
      preview: {
        rollover: { needs: number; wants: number; savings: number };
        savingsCategories: { id: string; name: string }[];
        nextCycleStart: string;
        nextCycleEnd: string;
        durationDays: number;
        durationUnit?: "days" | "months";
        durationMonths?: number;
        paydayDay: number;
      },
      allocations: Record<string, number>,
      overrides?: {
        durationDays?: number;
        durationMonths?: number;
        paydayDay?: number;
      }
    ): Promise<{ newCycleId: string } | null> => {
      if (!userId) return null;
      const current = state ?? createEmptyBudgetState(userId);
      const prevCycle = activeCycle ?? current.cycles[0];
      if (!prevCycle) return null;

      const monthlyNetIncome = getMonthlyNetIncome(current.incomeSources);
      if (monthlyNetIncome <= 0) return null;

      const { rollover } = preview;
      const savingsIdByName = new Map<string, string>();
      preview.savingsCategories.forEach((s) =>
        savingsIdByName.set(s.name, s.id)
      );

      const paydayDay = overrides?.paydayDay ?? preview.paydayDay;
      const start = new Date(preview.nextCycleStart);
      let end: Date;
      const useMonths =
        overrides?.durationMonths != null ||
        (preview.durationUnit === "months" &&
          (preview.durationMonths ?? 0) >= 1);
      const monthsVal =
        overrides?.durationMonths ?? preview.durationMonths ?? 1;
      if (useMonths) {
        const periodEnd = addMonths(start, Math.max(1, monthsVal));
        end = new Date(periodEnd);
        end.setDate(end.getDate() - 1);
      } else {
        const durationDays = overrides?.durationDays ?? preview.durationDays;
        end = new Date(start);
        end.setDate(end.getDate() + Math.max(1, durationDays) - 1);
      }

      const baseTime = Date.now();
      const cycleId = uuidv4();
      const cycleCreatedAt = new Date(baseTime - 1).toISOString();
      const cycle: BudgetCycle = {
        id: cycleId,
        userId,
        startDate: toISODate(start),
        endDate: toISODate(end),
        paydayDay,
        needsPct: prevCycle.needsPct,
        wantsPct: prevCycle.wantsPct,
        savingsPct: prevCycle.savingsPct,
        rolloverFromPrevious: rollover,
        reallocationApplied: false,
        createdAt: cycleCreatedAt,
        updatedAt: cycleCreatedAt,
      };

      const prevCategories = current.categories.filter(
        (c) => c.cycleId === prevCycle.id
      );
      const catCreatedAt = new Date(baseTime).toISOString();
      const categories: BudgetCategory[] = prevCategories.map((cat, idx) => {
        const newId =
          cat.bucket === "savings"
            ? savingsIdByName.get(cat.name) ?? uuidv4()
            : uuidv4();
        const add = cat.bucket === "savings" ? allocations[newId] ?? 0 : 0;
        return {
          ...cat,
          id: newId,
          cycleId,
          limitAmount: cat.limitAmount + add,
          createdAt: new Date(baseTime + idx + 1).toISOString(),
          updatedAt: catCreatedAt,
        };
      });

      const next: BudgetState = {
        ...current,
        cycles: [cycle, ...current.cycles],
        categories: [
          ...categories,
          ...current.categories.filter((c) => c.cycleId !== cycleId),
        ],
      };
      await persistState(next);

      const cyclePayload = {
        id: cycle.id,
        user_id: userId,
        start_date: cycle.startDate,
        end_date: cycle.endDate,
        payday_day: paydayDay,
        needs_pct: cycle.needsPct,
        wants_pct: cycle.wantsPct,
        savings_pct: cycle.savingsPct,
        rollover_from_previous: rollover,
      };
      const cycleResult = await syncCycleDirect(cyclePayload);
      if (!cycleResult.ok) {
        throw new Error(cycleResult.error ?? "Failed to sync cycle");
      }

      for (const cat of categories) {
        await enqueueMutation(userId, {
          id: makeQueueId(),
          userId,
          createdAt: cat.createdAt,
          kind: "upsert_category",
          payload: categoryToPayload(cat),
        });
      }
      await flushBudgetQueue(userId);
      await refreshQueue();

      return { newCycleId: cycleId };
    },
    [activeCycle, persistState, state, userId, refreshQueue]
  );

  /**
   * Create new cycle immediately (no rollover modal). For no-rollover or no-savings-cats case.
   */
  const createNewCycleImmediate = useCallback(async () => {
    if (!userId) return null;
    const current = state ?? createEmptyBudgetState(userId);
    const prevCycle = activeCycle ?? current.cycles[0];
    if (!prevCycle) return null;

    const prevCategories = current.categories.filter(
      (c) => c.cycleId === prevCycle.id
    );

    const baseTime = Date.now();
    const cycleId = uuidv4();
    const cycleCreatedAt = new Date(baseTime - 1).toISOString();
    const monthlyNetIncome = getMonthlyNetIncome(current.incomeSources);
    const rollover =
      monthlyNetIncome > 0
        ? calculateRollover(prevCycle, current.transactions, monthlyNetIncome)
        : { needs: 0, wants: 0, savings: 0 };

    const paydayDay = prevCycle.paydayDay;
    const durationDays =
      Math.round(
        (new Date(prevCycle.endDate).getTime() -
          new Date(prevCycle.startDate).getTime()) /
          86400000
      ) + 1;
    const useMonths = durationDays > 14;
    const { start, end } = computeNextCycleFromPrevious(
      prevCycle.startDate,
      prevCycle.endDate,
      useMonths
    );

    const cycle: BudgetCycle = {
      id: cycleId,
      userId,
      startDate: toISODate(start),
      endDate: toISODate(end),
      paydayDay,
      needsPct: prevCycle.needsPct,
      wantsPct: prevCycle.wantsPct,
      savingsPct: prevCycle.savingsPct,
      rolloverFromPrevious: rollover,
      reallocationApplied: false,
      createdAt: cycleCreatedAt,
      updatedAt: cycleCreatedAt,
    };

    const catCreatedAt = new Date(baseTime).toISOString();
    const categories: BudgetCategory[] = prevCategories.map((cat, idx) => ({
      ...cat,
      id: uuidv4(),
      cycleId,
      createdAt: new Date(baseTime + idx + 1).toISOString(),
      updatedAt: catCreatedAt,
    }));

    const next: BudgetState = {
      ...current,
      cycles: [cycle, ...current.cycles],
      categories: [
        ...categories,
        ...current.categories.filter((c) => c.cycleId !== cycleId),
      ],
    };
    await persistState(next);

    const cyclePayload = {
      id: cycle.id,
      user_id: userId,
      start_date: cycle.startDate,
      end_date: cycle.endDate,
      payday_day: paydayDay,
      needs_pct: cycle.needsPct,
      wants_pct: cycle.wantsPct,
      savings_pct: cycle.savingsPct,
      rollover_from_previous: rollover,
    };
    const cycleResult = await syncCycleDirect(cyclePayload);
    if (!cycleResult.ok) {
      throw new Error(cycleResult.error ?? "Failed to sync cycle");
    }

    for (const cat of categories) {
      await enqueueMutation(userId, {
        id: makeQueueId(),
        userId,
        createdAt: cat.createdAt,
        kind: "upsert_category",
        payload: categoryToPayload(cat),
      });
    }
    await flushBudgetQueue(userId);
    await refreshQueue();

    return { newCycleId: cycleId };
  }, [activeCycle, persistState, state, userId, refreshQueue]);

  const addIncomeSource = useCallback(
    async ({
      name,
      type,
      amount,
      applyDeductions,
    }: {
      name: string;
      type: IncomeSourceType;
      amount: number;
      applyDeductions: boolean;
    }) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const now = new Date().toISOString();
      const source: IncomeSource = {
        id: uuidv4(),
        userId,
        name: name.trim() || "Income",
        type,
        amount: Math.max(0, amount),
        applyDeductions: type === "primary" ? applyDeductions : false,
        createdAt: now,
        updatedAt: now,
      };

      const nextIncomeSources = [source, ...current.incomeSources];
      const tempState: BudgetState = {
        ...current,
        incomeSources: nextIncomeSources,
      };
      const recalculated = recalculateBudgetFromAllocations(tempState);
      const nextCategories = recalculated.categories;
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;

      const next: BudgetState = {
        ...current,
        incomeSources: nextIncomeSources,
        categories: nextCategories,
      };
      await persistState(next);

      const syncResult = await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "upsert_income_source",
        payload: {
          id: source.id,
          user_id: userId,
          name: source.name,
          type: source.type,
          amount: source.amount,
          apply_deductions: source.applyDeductions,
        },
      });

      // Persist recomputed category limits (if any); always enqueue so offline/failed sync still queues limits.
      if (activeCycleId && activeCycle) {
        const changed = nextCategories.filter(
          (c) => c.cycleId === activeCycleId
        );
        for (const cat of changed) {
          await enqueueAndTry({
            id: makeQueueId(),
            userId,
            createdAt: now,
            kind: "upsert_category",
            payload: {
              id: cat.id,
              user_id: userId,
              cycle_id: cat.cycleId,
              bucket: cat.bucket,
              name: cat.name,
              limit_amount: cat.limitAmount,
            },
          });
        }
      }
      if (syncResult && !syncResult.ok) {
        return { syncError: syncResult.error };
      }
    },
    [activeCycle, enqueueAndTry, persistState, state, userId]
  );

  const updateIncomeSource = useCallback(
    async (
      incomeSourceId: string,
      patch: {
        name: string;
        type: IncomeSourceType;
        amount: number;
        applyDeductions: boolean;
      }
    ) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const now = new Date().toISOString();

      const updatedIncome = current.incomeSources.map((s) => {
        if (s.id !== incomeSourceId) return s;
        return {
          ...s,
          name: patch.name.trim() || s.name,
          type: patch.type,
          amount: Math.max(0, patch.amount),
          applyDeductions:
            patch.type === "primary" ? patch.applyDeductions : false,
          updatedAt: now,
        };
      });

      const tempState: BudgetState = {
        ...current,
        incomeSources: updatedIncome,
      };
      const recalculated = recalculateBudgetFromAllocations(tempState);
      const nextCategories = recalculated.categories;
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;

      const next: BudgetState = {
        ...current,
        incomeSources: updatedIncome,
        categories: nextCategories,
      };
      await persistState(next);

      // Persist income source to Supabase
      let syncError: string | undefined;
      const src = updatedIncome.find((s) => s.id === incomeSourceId);
      if (src) {
        const syncResult = await enqueueAndTry({
          id: makeQueueId(),
          userId,
          createdAt: now,
          kind: "upsert_income_source",
          payload: {
            id: src.id,
            user_id: userId,
            name: src.name,
            type: src.type,
            amount: src.amount,
            apply_deductions: src.applyDeductions,
          },
        });
        if (syncResult && !syncResult.ok) syncError = syncResult.error;
      }

      // Persist recomputed category limits; always enqueue so offline/failed sync still queues limits.
      if (activeCycleId && activeCycle) {
        const changed = nextCategories.filter(
          (c) => c.cycleId === activeCycleId
        );
        for (const cat of changed) {
          await enqueueAndTry({
            id: makeQueueId(),
            userId,
            createdAt: now,
            kind: "upsert_category",
            payload: {
              id: cat.id,
              user_id: userId,
              cycle_id: cat.cycleId,
              bucket: cat.bucket,
              name: cat.name,
              limit_amount: cat.limitAmount,
            },
          });
        }
      }
      if (syncError) return { syncError };
    },
    [activeCycle, enqueueAndTry, persistState, state, userId]
  );

  const deleteIncomeSource = useCallback(
    async (incomeSourceId: string) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;

      const nextIncome = current.incomeSources.filter(
        (s) => s.id !== incomeSourceId
      );

      const tempState: BudgetState = {
        ...current,
        incomeSources: nextIncome,
      };
      const recalculated = recalculateBudgetFromAllocations(tempState);
      const nextCategories = recalculated.categories;

      const next: BudgetState = {
        ...current,
        incomeSources: nextIncome,
        categories: nextCategories,
      };
      await persistState(next);

      // Queue delete in DB
      const syncResult = await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: new Date().toISOString(),
        kind: "delete_income_source",
        payload: { id: incomeSourceId, user_id: userId },
      });

      // If we recomputed limits, queue upserts for affected categories; always enqueue so offline/failed sync still queues limits.
      if (activeCycleId && activeCycle) {
        const changed = nextCategories.filter(
          (c) => c.cycleId === activeCycleId
        );
        for (const cat of changed) {
          await enqueueAndTry({
            id: makeQueueId(),
            userId,
            createdAt: new Date().toISOString(),
            kind: "upsert_category",
            payload: {
              id: cat.id,
              user_id: userId,
              cycle_id: cat.cycleId,
              bucket: cat.bucket,
              name: cat.name,
              limit_amount: cat.limitAmount,
            },
          });
        }
      }
      if (syncResult && !syncResult.ok) {
        return { syncError: syncResult.error };
      }
    },
    [activeCycle, enqueueAndTry, persistState, state, userId]
  );

  const addTransaction = useCallback(
    async ({
      bucket,
      categoryId,
      amount,
      note,
      occurredAt,
      debtId,
    }: {
      bucket: BudgetBucket;
      categoryId?: string | null;
      amount: number;
      note?: string;
      occurredAt?: Date;
      debtId?: string | null;
    }) => {
      if (!userId) return {};
      const current = state ?? createEmptyBudgetState(userId);
      const cycleId = activeCycle?.id ?? current.cycles[0]?.id;
      if (!cycleId) {
        return {};
      }
      const now = new Date().toISOString();
      const tx: BudgetTransaction = {
        id: uuidv4(),
        userId,
        cycleId,
        bucket,
        categoryId: categoryId ?? null,
        amount: Math.max(0, amount),
        note: note?.trim() ? note.trim() : undefined,
        occurredAt: (occurredAt ?? new Date()).toISOString(),
        source: "manual",
        debtId: debtId ?? null,
        createdAt: now,
      };

      const next: BudgetState = {
        ...current,
        transactions: [tx, ...current.transactions],
      };
      await persistState(next);

      await logActivity({
        userId,
        cycleId,
        actionType: "transaction_added",
        entityType: "transaction",
        entityId: tx.id,
        intendedAmount: tx.amount,
        metadata: { bucket, categoryId: categoryId ?? null },
      });

      const wouldExceedNeeds = (() => {
        if (bucket !== "needs" || !categoryId) return false;
        const category = current.categories.find((c) => c.id === categoryId);
        if (!category) return false;
        if (category.limitAmount <= 0) return false;
        const spent = current.transactions
          .filter(
            (t) =>
              t.cycleId === cycleId &&
              t.bucket === "needs" &&
              t.categoryId === categoryId
          )
          .reduce((s, t) => s + t.amount, 0);
        return spent + tx.amount > category.limitAmount;
      })();

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "insert_transaction",
        payload: {
          id: tx.id,
          user_id: userId,
          cycle_id: tx.cycleId,
          bucket: tx.bucket,
          category_id: tx.categoryId,
          amount: tx.amount,
          note: tx.note ?? null,
          occurred_at: tx.occurredAt,
          source: tx.source,
          debt_id: tx.debtId ?? null,
        },
      });

      if (wouldExceedNeeds) {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
        } catch {
          // ignore
        }
      }

      return { wouldExceedNeeds };
    },
    [activeCycle?.id, enqueueAndTry, persistState, state, userId]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      updates: {
        bucket: BudgetBucket;
        categoryId?: string | null;
        amount: number;
        note?: string;
        occurredAt?: string;
      }
    ) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const existing = current.transactions.find((t) => t.id === id);
      if (!existing) return;

      const now = new Date().toISOString();
      const updated: BudgetTransaction = {
        ...existing,
        bucket: updates.bucket,
        categoryId: updates.categoryId ?? null,
        amount: Math.max(0, updates.amount),
        note: updates.note?.trim() ? updates.note.trim() : undefined,
        occurredAt: updates.occurredAt ?? existing.occurredAt,
      };

      const next: BudgetState = {
        ...current,
        transactions: current.transactions.map((t) =>
          t.id === id ? updated : t
        ),
      };
      await persistState(next);

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "update_transaction",
        payload: {
          id: updated.id,
          user_id: userId,
          bucket: updated.bucket,
          category_id: updated.categoryId,
          amount: updated.amount,
          note: updated.note ?? null,
          occurred_at: updated.occurredAt,
        },
      });
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const existing = current.transactions.find((t) => t.id === id);
      if (!existing) return;

      const next: BudgetState = {
        ...current,
        transactions: current.transactions.filter((t) => t.id !== id),
      };
      await persistState(next);

      const now = new Date().toISOString();
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "delete_transaction",
        payload: { id, user_id: userId },
      });
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const addCategory = useCallback(
    async ({
      name,
      bucket,
      limitAmount = 0,
      icon,
    }: {
      name: string;
      bucket: BudgetBucket;
      limitAmount?: number;
      icon?: import("../constants/categoryIcons").CategoryIconName;
    }) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;
      if (!activeCycleId) return;

      const cycleCats = current.categories.filter(
        (c) => c.cycleId === activeCycleId && c.bucket === bucket
      );
      const nextSortOrder =
        cycleCats.length > 0
          ? Math.max(...cycleCats.map((c) => c.sortOrder)) + 1
          : 0;

      const now = new Date().toISOString();
      const limit = Math.max(0, limitAmount);
      const userSetLimit = limit > 0;
      const newCat: BudgetCategory = {
        id: uuidv4(),
        userId,
        cycleId: activeCycleId,
        bucket,
        name: name.trim() || "Custom",
        icon: icon ?? null,
        limitAmount: limit,
        isCustom: true,
        parentId: null,
        sortOrder: nextSortOrder,
        suggestedLimit: null,
        isArchived: false,
        manualOverride: userSetLimit,
        createdAt: now,
        updatedAt: now,
      };

      const next: BudgetState = {
        ...current,
        categories: [...current.categories, newCat],
      };
      await persistState(next);

      await logActivity({
        userId,
        cycleId: activeCycleId,
        actionType: "category_added",
        entityType: "category",
        entityId: newCat.id,
        intendedAmount: limit,
        metadata: { name: newCat.name, bucket },
      });

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "upsert_category",
        payload: categoryToPayload(newCat),
      });
    },
    [activeCycle?.id, enqueueAndTry, persistState, state, userId]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);

      // Remove category locally + null out any tx categoryId
      const next: BudgetState = {
        ...current,
        categories: current.categories.filter((c) => c.id !== categoryId),
        transactions: current.transactions.map((t) =>
          t.categoryId === categoryId ? { ...t, categoryId: null } : t
        ),
      };
      await persistState(next);

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: new Date().toISOString(),
        kind: "delete_category",
        payload: { id: categoryId, user_id: userId },
      });
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const deleteCategories = useCallback(
    async (categoryIds: string[]) => {
      if (!userId || categoryIds.length === 0) return;
      const idsSet = new Set(categoryIds);
      const current = state ?? createEmptyBudgetState(userId);

      const next: BudgetState = {
        ...current,
        categories: current.categories.filter((c) => !idsSet.has(c.id)),
        transactions: current.transactions.map((t) =>
          t.categoryId && idsSet.has(t.categoryId)
            ? { ...t, categoryId: null }
            : t
        ),
      };
      await persistState(next);

      const now = new Date().toISOString();
      for (const id of categoryIds) {
        await enqueueAndTry({
          id: makeQueueId(),
          userId,
          createdAt: now,
          kind: "delete_category",
          payload: { id, user_id: userId },
        });
      }
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const updateCategoryLimit = useCallback(
    async (
      categoryId: string,
      nextLimitAmount: number,
      icon?: import("../constants/categoryIcons").CategoryIconName
    ) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const now = new Date().toISOString();
      const limit = Math.max(0, nextLimitAmount);
      const nextCategories = current.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              limitAmount: limit,
              manualOverride: true,
              ...(icon !== undefined && { icon }),
              updatedAt: now,
            }
          : c
      );
      const updated = nextCategories.find((c) => c.id === categoryId);
      const next: BudgetState = { ...current, categories: nextCategories };
      await persistState(next);

      if (updated) {
        await logActivity({
          userId,
          cycleId: updated.cycleId,
          actionType: "category_limit_updated",
          entityType: "category",
          entityId: categoryId,
          intendedAmount: limit,
          metadata: { name: updated.name, bucket: updated.bucket },
        });
      }

      if (!updated) return;
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "upsert_category",
        payload: categoryToPayload(updated),
      });
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const updateCycleDay = useCallback(
    async (nextPaydayDay: number) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const currentCycle = activeCycle ?? current.cycles[0];
      if (!currentCycle) return;

      const day = Math.max(1, Math.min(31, Math.floor(nextPaydayDay)));
      const { start, end } = computePaydayCycle(new Date(), day);
      const now = new Date().toISOString();

      const updatedCycle: BudgetCycle = {
        ...currentCycle,
        paydayDay: day,
        startDate: toISODate(start),
        endDate: toISODate(end),
        updatedAt: now,
      };

      const next: BudgetState = {
        ...current,
        prefs: { ...current.prefs, paydayDay: day },
        cycles: [
          updatedCycle,
          ...current.cycles.filter((c) => c.id !== currentCycle.id),
        ],
      };

      await persistState(next);

      // Persist to Supabase (offline-first)
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "upsert_profile",
        payload: { id: userId, payday_day: day },
      });

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "upsert_cycle",
        payload: {
          id: updatedCycle.id,
          user_id: userId,
          start_date: updatedCycle.startDate,
          end_date: updatedCycle.endDate,
          payday_day: day,
          needs_pct: updatedCycle.needsPct,
          wants_pct: updatedCycle.wantsPct,
          savings_pct: updatedCycle.savingsPct,
        },
      });
    },
    [activeCycle, enqueueAndTry, persistState, state, userId]
  );

  const updateCycleAllocation = useCallback(
    async (
      cycleId: string,
      allocation: { needsPct: number; wantsPct: number; savingsPct: number },
      options?: { reallocationReason?: string }
    ) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const cycle = current.cycles.find((c) => c.id === cycleId);
      if (!cycle) return;
      const now = new Date().toISOString();
      const isReallocation = !!options?.reallocationReason;
      const updatedCycle: BudgetCycle = {
        ...cycle,
        needsPct: allocation.needsPct,
        wantsPct: allocation.wantsPct,
        savingsPct: allocation.savingsPct,
        reallocationApplied: isReallocation ? true : cycle.reallocationApplied,
        reallocationReason: isReallocation
          ? options.reallocationReason ?? null
          : cycle.reallocationReason,
        updatedAt: now,
      };
      const next: BudgetState = {
        ...current,
        cycles: [
          updatedCycle,
          ...current.cycles.filter((c) => c.id !== cycleId),
        ],
      };
      await persistState(next);
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: isReallocation ? "apply_reallocation" : "upsert_cycle",
        payload: isReallocation
          ? {
              cycle_id: cycleId,
              needs_pct: updatedCycle.needsPct,
              wants_pct: updatedCycle.wantsPct,
              savings_pct: updatedCycle.savingsPct,
              reallocation_reason: options!.reallocationReason,
            }
          : {
              id: updatedCycle.id,
              user_id: userId,
              start_date: updatedCycle.startDate,
              end_date: updatedCycle.endDate,
              payday_day: updatedCycle.paydayDay,
              needs_pct: updatedCycle.needsPct,
              wants_pct: updatedCycle.wantsPct,
              savings_pct: updatedCycle.savingsPct,
            },
      });
    },
    [enqueueAndTry, persistState, state, userId]
  );

  const insertDebt = useCallback(
    async (params: {
      name: string;
      totalAmount: number;
      remainingAmount: number;
      monthlyPayment: number;
    }) => {
      if (!userId) return;
      const now = new Date().toISOString();
      const id = uuidv4();
      const startDate = new Date().toISOString().slice(0, 10);
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "insert_debt",
        payload: {
          id,
          user_id: userId,
          name: params.name,
          total_amount: params.totalAmount,
          remaining_amount: params.remainingAmount,
          monthly_payment: params.monthlyPayment,
          start_date: startDate,
          is_active: true,
        },
      });
    },
    [enqueueAndTry, userId]
  );

  const resetBudget = useCallback(async () => {
    if (!userId) return;

    // Clear local immediately
    await clearBudgetLocal(userId);
    const empty = createEmptyBudgetState(userId);
    await useBudgetStore.getState().persistState(empty);
    await refreshQueue();

    // Queue remote reset so it can retry offline
    await enqueueAndTry({
      id: makeQueueId(),
      userId,
      createdAt: new Date().toISOString(),
      kind: "reset_budget",
      payload: { user_id: userId },
    });
  }, [enqueueAndTry, refreshQueue, userId]);

  const deleteAllBudgetData = useCallback(
    async (removeProfile: boolean) => {
      if (!userId) return;
      // Local-first: clear local state now, queue remote reset for eventual sync.
      await clearBudgetLocal(userId);
      const empty = createEmptyBudgetState(userId);
      await useBudgetStore.getState().persistState(empty);
      await refreshQueue();

      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: new Date().toISOString(),
        kind: "reset_budget",
        payload: {
          user_id: userId,
          remove_profile: removeProfile,
        },
      });

      if (removeProfile) {
        await clearProfileVitalsCache(userId);
        await writePersonalizationStatusCache(userId, false);
        void usePersonalizationStore.getState().refresh();
        void useProfileVitalsStore.getState().refresh();
      }
    },
    [enqueueAndTry, refreshQueue, userId]
  );

  const syncNow = useCallback(async () => {
    if (!userId) return;
    cancelScheduledRetry();

    const { setSyncing, setLastSyncRunEndedAt, setRetryIn } =
      useBudgetStore.getState();
    setSyncing(true); // start tag: UI shows "Syncing…" for the whole run
    let firstFailCount = 0;
    try {
      const first = await flushBudgetQueue(userId);
      firstFailCount = first.failCount;
    } finally {
      await refreshQueue(); // queue state updates only at end (no per-item UI churn)
      setLastSyncRunEndedAt(Date.now()); // end tag: UI can show toast / final state
      setSyncing(false);
    }

    // If anything failed, wait before trying again.
    if (firstFailCount > 0) {
      let remaining = 10;
      setRetryIn(remaining);

      retryIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setRetryIn(remaining);

        if (remaining <= 0) {
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
          setRetryIn(null);

          // Retry once (delayed), then stop (queue remains if still failing).
          void (async () => {
            if (!userId) return;
            const store = useBudgetStore.getState();
            store.setSyncing(true); // start tag (retry run)
            try {
              await flushBudgetQueue(userId);
            } finally {
              await store.refreshQueue();
              store.setLastSyncRunEndedAt(Date.now()); // end tag
              store.setSyncing(false);
            }
          })();
        }
      }, 1000);
    }
  }, [cancelScheduledRetry, refreshQueue, userId]);

  const recalculateBudget = useCallback(
    async (overrideState?: BudgetState) => {
      if (!userId) return;
      const current =
        overrideState ?? state ?? (await loadBudgetState(userId));
      const next = recalculateBudgetFromAllocations(current);
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;
      await persistState(next);
      const now = new Date().toISOString();
      const cycleCats = next.categories.filter(
        (c) => c.cycleId === activeCycleId
      );
      for (const cat of cycleCats) {
        const prev = current.categories.find((x) => x.id === cat.id);
        if (prev && prev.limitAmount === cat.limitAmount) continue;
        await enqueueAndTry({
          id: makeQueueId(),
          userId,
          createdAt: now,
          kind: "upsert_category",
          payload: categoryToPayload(cat),
        });
      }
    },
    [activeCycle?.id, enqueueAndTry, persistState, state, userId]
  );

  const applyTemplate = useCallback(
    async (
      cycleId: string,
      allocation: { needsPct: number; wantsPct: number; savingsPct: number }
    ) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
      const cycle = current.cycles.find((c) => c.id === cycleId);
      if (!cycle) return;
      const now = new Date().toISOString();
      const updatedCycle: BudgetCycle = {
        ...cycle,
        needsPct: allocation.needsPct,
        wantsPct: allocation.wantsPct,
        savingsPct: allocation.savingsPct,
        updatedAt: now,
      };
      const next: BudgetState = {
        ...current,
        cycles: [
          updatedCycle,
          ...current.cycles.filter((c) => c.id !== cycleId),
        ],
      };
      await persistState(next);
      await recalculateBudget(next);
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: now,
        kind: "apply_template",
        payload: {
          cycle_id: cycleId,
          needs_pct: updatedCycle.needsPct,
          wants_pct: updatedCycle.wantsPct,
          savings_pct: updatedCycle.savingsPct,
        },
      });
    },
    [enqueueAndTry, persistState, recalculateBudget, state, userId]
  );

  const hydrateFromRemote = useCallback(
    async (options?: { force?: boolean }) => {
      if (!userId) return;
      // Don't clobber local offline-first changes while there are unsynced mutations.
      const q = await loadBudgetQueue(userId);
      if (q.items.length > 0 && !options?.force) return;

      const res = await hydrateBudgetStateFromRemote(userId, persistState, {
        mode: q.items.length > 0 ? "merge" : "replace",
        getLocalState: () => loadBudgetState(userId),
      });
      if (res.ok && res.hydrated) {
        // Ensure we re-read (and update derived totals/cycle) after hydration.
        await reload();
      }
    },
    [persistState, reload, userId]
  );

  const retryMutation = useCallback(
    async (id: string) => {
      if (!userId) return;
      const q = await loadBudgetQueue(userId);
      const item = q.items.find((i) => i.id === id);
      if (!item) return;
      await trySyncMutation(userId, item);
      await refreshQueue();
    },
    [refreshQueue, userId]
  );

  const clearLocal = useCallback(async () => {
    if (!userId) return;
    await clearBudgetLocal(userId);
    await reload();
  }, [reload, userId]);

  return {
    state,
    queue,
    isLoading,
    isSyncing,
    lastSyncRunEndedAt,
    clearSyncRunResult,
    retryIn,
    pendingCount,
    cycle,
    activeCycle,
    totals,
    setupBudget,
    addIncomeSource,
    updateIncomeSource,
    deleteIncomeSource,
    addCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteCategory,
    deleteCategories,
    updateCategoryLimit,
    updateCycleDay,
    updateCycleAllocation,
    applyTemplate,
    insertDebt,
    resetBudget,
    deleteAllBudgetData,
    computeNewCyclePreview,
    createNewCycleFromPreview,
    createNewCycleImmediate,
    syncNow,
    hydrateFromRemote,
    recalculateBudget,
    retryMutation,
    clearLocal,
    reload,
  };
}
