import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";

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
import { hydrateBudgetStateFromRemote } from "../utils/budgetHydrate";
import { recalculateBudgetFromAllocations } from "../utils/budgetRecalc";
import {
  BUDGET_CHANGED_EVENT,
  clearBudgetLocal,
  createEmptyBudgetState,
  enqueueMutation,
  loadBudgetQueue,
  loadBudgetState,
  saveBudgetState,
} from "../utils/budgetStorage";
import { flushBudgetQueue, trySyncMutation } from "../utils/budgetSync";
import { computeGhanaTax2026Monthly } from "../utils/ghanaTax";
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

function categoryToPayload(cat: BudgetCategory): Record<string, unknown> {
  return {
    id: cat.id,
    user_id: cat.userId,
    cycle_id: cat.cycleId,
    bucket: cat.bucket,
    name: cat.name,
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
  isSyncing: boolean;
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
  }) => Promise<void>;
  addIncomeSource: (params: {
    name: string;
    type: IncomeSourceType;
    amount: number;
    applyDeductions: boolean;
  }) => Promise<void>;
  updateIncomeSource: (
    incomeSourceId: string,
    patch: {
      name: string;
      type: IncomeSourceType;
      amount: number;
      applyDeductions: boolean;
    }
  ) => Promise<void>;
  addTransaction: (params: {
    bucket: BudgetBucket;
    categoryId?: string | null;
    amount: number;
    note?: string;
    occurredAt?: Date;
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
  deleteIncomeSource: (incomeSourceId: string) => Promise<void>;
  addCategory: (params: {
    name: string;
    bucket: BudgetBucket;
    limitAmount?: number;
  }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategoryLimit: (
    categoryId: string,
    nextLimitAmount: number
  ) => Promise<void>;
  updateCycleDay: (nextPaydayDay: number) => Promise<void>;
  updateCycleAllocation: (
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
  syncNow: () => Promise<void>;
  hydrateFromRemote: (options?: { force?: boolean }) => Promise<void>;
  recalculateBudget: () => Promise<void>;
  retryMutation: (id: string) => Promise<void>;
  clearLocal: () => Promise<void>;
  reload: () => Promise<void>;
};

export function useBudget(userId?: string | null): UseBudgetReturn {
  const [state, setState] = useState<BudgetState | null>(null);
  const [queue, setQueue] = useState<BudgetQueue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancelScheduledRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    setRetryIn(null);
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
    if (!userId) {
      setState(null);
      setQueue(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [s, q] = await Promise.all([
      loadBudgetState(userId),
      loadBudgetQueue(userId),
    ]);
    setState(s);
    setQueue(q);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Cross-screen sync: if any screen changes budget state/queue, refresh here too.
  useEffect(() => {
    if (!userId) return;
    const sub = DeviceEventEmitter.addListener(
      BUDGET_CHANGED_EVENT,
      (payload?: { userId?: string }) => {
        if (payload?.userId === userId) {
          reload();
        }
      }
    );
    return () => {
      sub.remove();
    };
  }, [reload, userId]);

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

    const monthlyNetIncome = state.incomeSources.reduce((sum, src) => {
      if (src.type === "primary" && src.applyDeductions) {
        return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
      }
      return sum + src.amount;
    }, 0);

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
    setState(next);
    await saveBudgetState(next);
  }, []);

  const refreshQueue = useCallback(async () => {
    if (!userId) return;
    const q = await loadBudgetQueue(userId);
    setQueue(q);
  }, [userId]);

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
    }: {
      paydayDay: number;
      needsPct?: number;
      wantsPct?: number;
      savingsPct?: number;
      interests?: string[];
    }) => {
      if (!userId) return;
      const current = state ?? createEmptyBudgetState(userId);
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

      // Prefer explicit interests (from Vitals), else fall back to what we already have cached.
      const seeded = seedCategories(interests ?? current.prefs?.interests);
      const allNames: { bucket: BudgetBucket; name: string }[] = [
        ...seeded.needs.map((name) => ({ bucket: "needs" as const, name })),
        ...seeded.wants.map((name) => ({ bucket: "wants" as const, name })),
        ...seeded.savings.map((name) => ({ bucket: "savings" as const, name })),
      ];

      // Distribute bucket totals based on current income if available; otherwise 0 limits until income set
      const monthlyNetIncome = current.incomeSources.reduce((sum, src) => {
        if (src.type === "primary" && src.applyDeductions) {
          return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
        }
        return sum + src.amount;
      }, 0);
      const bucketTotals: Record<BudgetBucket, number> = {
        needs: monthlyNetIncome * needsPct,
        wants: monthlyNetIncome * wantsPct,
        savings: monthlyNetIncome * savingsPct,
      };
      const counts: Record<BudgetBucket, number> = {
        needs: seeded.needs.length,
        wants: seeded.wants.length,
        savings: seeded.savings.length,
      };

      const categories: BudgetCategory[] = allNames.map(
        ({ bucket, name }, index) => {
          const per =
            counts[bucket] > 0 ? bucketTotals[bucket] / counts[bucket] : 0;
          return {
            id: uuidv4(),
            userId,
            cycleId,
            bucket,
            name,
            limitAmount: Math.max(0, Math.round(per * 100) / 100),
            isCustom: false,
            parentId: null,
            sortOrder: index,
            suggestedLimit: null,
            isArchived: false,
            manualOverride: false,
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
    },
    [enqueueAndTry, persistState, state, userId]
  );

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

      // If a cycle exists, recompute per-category limits immediately so the UI matches
      // the new income (same behavior as edit/delete income source).
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;
      const nextCategories = (() => {
        if (!activeCycleId || !activeCycle) return current.categories;

        const monthlyNetIncome = nextIncomeSources.reduce((sum, src) => {
          if (src.type === "primary" && src.applyDeductions) {
            return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
          }
          return sum + src.amount;
        }, 0);

        const bucketTotals: Record<BudgetBucket, number> = {
          needs: monthlyNetIncome * activeCycle.needsPct,
          wants: monthlyNetIncome * activeCycle.wantsPct,
          savings: monthlyNetIncome * activeCycle.savingsPct,
        };

        const cycleCats = current.categories.filter(
          (c) => c.cycleId === activeCycleId
        );
        const counts: Record<BudgetBucket, number> = {
          needs: cycleCats.filter((c) => c.bucket === "needs").length,
          wants: cycleCats.filter((c) => c.bucket === "wants").length,
          savings: cycleCats.filter((c) => c.bucket === "savings").length,
        };

        return current.categories.map((c) => {
          if (c.cycleId !== activeCycleId) return c;
          if (c.manualOverride) return c;
          const per =
            counts[c.bucket] > 0
              ? bucketTotals[c.bucket] / counts[c.bucket]
              : 0;
          return {
            ...c,
            limitAmount: Math.max(0, Math.round(per * 100) / 100),
            updatedAt: now,
          };
        });
      })();

      const next: BudgetState = {
        ...current,
        incomeSources: nextIncomeSources,
        categories: nextCategories,
      };
      await persistState(next);

      await enqueueAndTry({
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

      // Persist recomputed category limits (if any)
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

      // Recompute current-cycle category limits (per user choice)
      const activeCycleId = activeCycle?.id ?? current.cycles[0]?.id;
      const nextCategories = (() => {
        if (!activeCycleId || !activeCycle) return current.categories;

        const monthlyNetIncome = updatedIncome.reduce((sum, src) => {
          if (src.type === "primary" && src.applyDeductions) {
            return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
          }
          return sum + src.amount;
        }, 0);

        const bucketTotals: Record<BudgetBucket, number> = {
          needs: monthlyNetIncome * activeCycle.needsPct,
          wants: monthlyNetIncome * activeCycle.wantsPct,
          savings: monthlyNetIncome * activeCycle.savingsPct,
        };

        const cycleCats = current.categories.filter(
          (c) => c.cycleId === activeCycleId
        );
        const counts: Record<BudgetBucket, number> = {
          needs: cycleCats.filter((c) => c.bucket === "needs").length,
          wants: cycleCats.filter((c) => c.bucket === "wants").length,
          savings: cycleCats.filter((c) => c.bucket === "savings").length,
        };

        return current.categories.map((c) => {
          if (c.cycleId !== activeCycleId) return c;
          if (c.manualOverride) return c;
          const per =
            counts[c.bucket] > 0
              ? bucketTotals[c.bucket] / counts[c.bucket]
              : 0;
          return {
            ...c,
            limitAmount: Math.max(0, Math.round(per * 100) / 100),
            updatedAt: now,
          };
        });
      })();

      const next: BudgetState = {
        ...current,
        incomeSources: updatedIncome,
        categories: nextCategories,
      };
      await persistState(next);

      // Persist income source to Supabase
      const src = updatedIncome.find((s) => s.id === incomeSourceId);
      if (src) {
        await enqueueAndTry({
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
      }

      // Persist recomputed category limits
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

      // Recompute current-cycle category limits (per user choice)
      const nextCategories = (() => {
        if (!activeCycleId || !activeCycle) return current.categories;

        const monthlyNetIncome = nextIncome.reduce((sum, src) => {
          if (src.type === "primary" && src.applyDeductions) {
            return sum + computeGhanaTax2026Monthly(src.amount).netTakeHome;
          }
          return sum + src.amount;
        }, 0);

        const bucketTotals: Record<BudgetBucket, number> = {
          needs: monthlyNetIncome * activeCycle.needsPct,
          wants: monthlyNetIncome * activeCycle.wantsPct,
          savings: monthlyNetIncome * activeCycle.savingsPct,
        };

        const cycleCats = current.categories.filter(
          (c) => c.cycleId === activeCycleId
        );
        const counts: Record<BudgetBucket, number> = {
          needs: cycleCats.filter((c) => c.bucket === "needs").length,
          wants: cycleCats.filter((c) => c.bucket === "wants").length,
          savings: cycleCats.filter((c) => c.bucket === "savings").length,
        };

        const now = new Date().toISOString();
        return current.categories.map((c) => {
          if (c.cycleId !== activeCycleId) return c;
          if (c.manualOverride) return c;
          const per =
            counts[c.bucket] > 0
              ? bucketTotals[c.bucket] / counts[c.bucket]
              : 0;
          return {
            ...c,
            limitAmount: Math.max(0, Math.round(per * 100) / 100),
            updatedAt: now,
          };
        });
      })();

      const next: BudgetState = {
        ...current,
        incomeSources: nextIncome,
        categories: nextCategories,
      };
      await persistState(next);

      // Queue delete in DB
      await enqueueAndTry({
        id: makeQueueId(),
        userId,
        createdAt: new Date().toISOString(),
        kind: "delete_income_source",
        payload: { id: incomeSourceId, user_id: userId },
      });

      // If we recomputed limits, queue upserts for affected categories
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
    }: {
      bucket: BudgetBucket;
      categoryId?: string | null;
      amount: number;
      note?: string;
      occurredAt?: Date;
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
    }: {
      name: string;
      bucket: BudgetBucket;
      limitAmount?: number;
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

  const updateCategoryLimit = useCallback(
    async (categoryId: string, nextLimitAmount: number) => {
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
    setState(empty);
    await saveBudgetState(empty);
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

  const syncNow = useCallback(async () => {
    if (!userId) return;
    cancelScheduledRetry();

    setIsSyncing(true);
    let firstFailCount = 0;
    try {
      const first = await flushBudgetQueue(userId);
      firstFailCount = first.failCount;
    } finally {
      await refreshQueue();
      setIsSyncing(false);
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
            setIsSyncing(true);
            try {
              await flushBudgetQueue(userId);
            } finally {
              await refreshQueue();
              setIsSyncing(false);
            }
          })();
        }
      }, 1000);
    }
  }, [cancelScheduledRetry, refreshQueue, userId]);

  const recalculateBudget = useCallback(async () => {
    if (!userId) return;
    const current = state ?? (await loadBudgetState(userId));
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
  }, [activeCycle?.id, enqueueAndTry, persistState, state, userId]);

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
    updateCategoryLimit,
    updateCycleDay,
    updateCycleAllocation,
    insertDebt,
    resetBudget,
    syncNow,
    hydrateFromRemote,
    recalculateBudget,
    retryMutation,
    clearLocal,
    reload,
  };
}
