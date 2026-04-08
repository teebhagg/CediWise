import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { enqueueMutation } from "@/utils/budgetStorage";
import { flushBudgetQueue } from "@/utils/budgetSync";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import { uuidv4 } from "@/utils/uuid";

const CACHE_PREFIX = "@cediwise_cash_flow:";

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

type CachedCashFlow = {
  balance: number | null;
  monthlyIncome: number | null;
  lastReset: string | null;
};

export type CashFlowStoreState = {
  userId: string | null;
  balance: number | null;
  monthlyIncome: number | null;
  lastReset: string | null;
  isLoading: boolean;
  isSetup: boolean;
  logoutEpoch: number;
};

export type CashFlowStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  setupCashFlow: (params: {
    balance: number;
    monthlyIncome: number;
    paydayDay?: number;
  }) => Promise<void>;
  updateBalance: (balance: number) => Promise<void>;
  resetForLogout: () => Promise<void>;
};

export type CashFlowStore = CashFlowStoreState & CashFlowStoreActions;

const initialState: CashFlowStoreState = {
  userId: null,
  balance: null,
  monthlyIncome: null,
  lastReset: null,
  isLoading: false,
  isSetup: false,
  logoutEpoch: 0,
};

export const useCashFlowStore = create<CashFlowStore>((set, get) => ({
  ...initialState,

  initForUser: async (userId: string | null) => {
    set({ userId, isLoading: true });
    if (!userId) {
      // reset state and bump epoch to invalidate in-flight refreshes
      set((state) => ({ ...initialState, logoutEpoch: state.logoutEpoch + 1 }));
      return;
    }
    await get().refresh();
  },

  refresh: async () => {
    const { userId } = get();
    if (!userId) {
      set({ isLoading: false });
      return;
    }
    // Track current logout epoch to guard against mid-refresh logout races
    const currentEpoch = get().logoutEpoch;

    const startUserId = userId;
    set({ isLoading: true });

    // Load from AsyncStorage cache first
    try {
      const raw = await AsyncStorage.getItem(cacheKey(startUserId));
      if (raw && get().userId === startUserId && get().logoutEpoch === currentEpoch) {
        const cached = JSON.parse(raw) as CachedCashFlow;
        const isSetup =
          cached.balance != null && cached.monthlyIncome != null;
        set({
          balance: cached.balance,
          monthlyIncome: cached.monthlyIncome,
          lastReset: cached.lastReset,
          isSetup,
          isLoading: false,
        });
        // fall through to fetch remote to refresh data
      }
    } catch {
      // ignore
    }

    // Fetch from Supabase
    if (!supabase) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "cash_flow_balance,cash_flow_monthly_income,cash_flow_last_reset,stable_salary"
        )
        .eq("id", startUserId)
        .maybeSingle();

        // If user logged out during the fetch, skip applying updates
        if (get().logoutEpoch !== currentEpoch) return;
        if (error || !data) {
          if (get().userId === startUserId) {
            set({ isLoading: false });
          }
          return;
        }

      const balance =
        data.cash_flow_balance != null
          ? Number(data.cash_flow_balance)
          : null;
      const monthlyIncomeFromProfile =
        data.cash_flow_monthly_income != null
          ? Number(data.cash_flow_monthly_income)
          : data.stable_salary != null
          ? Number(data.stable_salary)
          : null;
      const lastReset = (data.cash_flow_last_reset as string | null) ?? null;
      const isSetup = balance != null && monthlyIncomeFromProfile != null;
      // Guard against logout during async work
      if (get().logoutEpoch !== currentEpoch) return;
      set({
        balance,
        monthlyIncome: monthlyIncomeFromProfile,
        lastReset,
        isSetup,
      });

      await AsyncStorage.setItem(
        cacheKey(startUserId),
        JSON.stringify({
          balance,
          monthlyIncome: monthlyIncomeFromProfile,
          lastReset,
        } satisfies CachedCashFlow)
      );
    } catch (err) {
      log.error("cashFlowStore.refresh failed:", err);
    } finally {
      // If user logged out mid-refresh, skip finalizing this refresh
      if (get().userId === startUserId && get().logoutEpoch === currentEpoch) {
        set({ isLoading: false });
      }
    }
  },

  setupCashFlow: async ({ balance, monthlyIncome, paydayDay }) => {
    const { userId } = get();
    if (!userId) throw new Error("User not authenticated");

    const now = new Date().toISOString();

    set({
      balance,
      monthlyIncome,
      lastReset: now,
      isSetup: true,
    });

    await AsyncStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        balance,
        monthlyIncome,
        lastReset: now,
      } satisfies CachedCashFlow)
    );

    const profilePayload: Record<string, unknown> = {
      id: userId,
      cash_flow_balance: balance,
      cash_flow_monthly_income: monthlyIncome,
      cash_flow_last_reset: now,
      updated_at: now,
    };

    if (paydayDay != null) {
      profilePayload.payday_day = paydayDay;
    }

    await enqueueMutation(userId, {
      id: uuidv4(),
      userId,
      createdAt: now,
      kind: "upsert_profile",
      payload: profilePayload,
    });

    await flushBudgetQueue(userId);
  },

  updateBalance: async (balance: number) => {
    const { userId, monthlyIncome } = get();
    if (!userId) throw new Error("User not authenticated");

    const now = new Date().toISOString();

    set({ balance, lastReset: now });

    await AsyncStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        balance,
        monthlyIncome,
        lastReset: now,
      } satisfies CachedCashFlow)
    );

    await enqueueMutation(userId, {
      id: uuidv4(),
      userId,
      createdAt: now,
      kind: "upsert_profile",
      payload: {
        id: userId,
        cash_flow_balance: balance,
        cash_flow_last_reset: now,
        updated_at: now,
      },
    });

    await flushBudgetQueue(userId);
  },

  resetForLogout: (): Promise<void> => {
    const { userId } = get();
    if (userId) {
      // Fire-and-forget remove to minimize logout latency in tests
      AsyncStorage.removeItem(cacheKey(userId)).catch(() => {});
    }
    // bump epoch to invalidate any pending refreshes and reset state
    set((state) => ({
      ...initialState,
      logoutEpoch: state.logoutEpoch + 1,
    }));
    return Promise.resolve();
  },
}));
