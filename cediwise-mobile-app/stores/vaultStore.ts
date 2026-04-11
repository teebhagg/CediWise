import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { BudgetState, VaultDeposit, VaultSummary } from "@/types/budget";
import {
  enqueueMutation,
  loadBudgetQueue,
  removeQueuedMutationsByIds,
} from "@/utils/budgetStorage";
import { flushBudgetQueueUntilMutationIdsCleared } from "@/utils/budgetSync";
import {
  computeCycleRolloverDeposit,
  computeVaultTotal,
  isCycleEnded,
  sortDepositsVaultLedgerOrder,
} from "@/utils/vaultCalculator";
import { getMonthlyDisposableIncome } from "@/utils/incomeCalculations";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import { getActiveTaxConfig } from "@/utils/taxSync";
import { uuidv4 } from "@/utils/uuid";

import { useBudgetStore } from "./budgetStore";
import { useRecurringExpensesStore } from "./recurringExpensesStore";

const CACHE_PREFIX = "@cediwise_vault_deposits:";

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

function queueMutationId(): string {
  return uuidv4();
}

function rowToDeposit(r: Record<string, unknown>): VaultDeposit {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    source: r.source as VaultDeposit["source"],
    amount: Number(r.amount),
    sourceCycleId: (r.source_cycle_id as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    depositedAt: String(r.deposited_at),
    createdAt: String(r.created_at),
  };
}

function depositToInsertPayload(d: VaultDeposit): Record<string, unknown> {
  return {
    id: d.id,
    user_id: d.userId,
    source: d.source,
    amount: d.amount,
    source_cycle_id: d.sourceCycleId ?? null,
    note: d.note ?? null,
    deposited_at: d.depositedAt,
    created_at: d.createdAt,
  };
}

/** Merge server rows with optimistic vault rows still waiting in the budget mutation queue. */
async function mergeRemoteDepositsWithPendingQueue(
  userId: string,
  remote: VaultDeposit[],
): Promise<VaultDeposit[]> {
  const queue = await loadBudgetQueue(userId);
  const byId = new Map(remote.map((d) => [d.id, { ...d }]));

  for (const it of queue.items) {
    if (it.kind === "update_vault_deposit") {
      const p = it.payload as {
        id: string;
        amount: number;
        note?: string | null;
        user_id: string;
      };
      const cur = byId.get(p.id);
      if (cur && cur.userId === p.user_id) {
        byId.set(p.id, {
          ...cur,
          amount: p.amount,
          note: p.note ?? cur.note,
        });
      }
    }
  }

  const remoteIds = new Set(remote.map((d) => d.id));
  for (const it of queue.items) {
    if (it.kind !== "insert_vault_deposit") continue;
    const d = rowToDeposit(it.payload as Record<string, unknown>);
    if (d.userId !== userId) continue;
    if (!remoteIds.has(d.id)) {
      byId.set(d.id, d);
    }
  }

  return sortDepositsVaultLedgerOrder([...byId.values()]);
}

async function saveCache(userId: string, deposits: VaultDeposit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(deposits));
  } catch {
    // ignore
  }
}

export type VaultStoreState = {
  userId: string | null;
  deposits: VaultDeposit[];
  summary: VaultSummary | null;
  isLoading: boolean;
  lastSyncedAt: string | null;
  logoutEpoch: number;
};

export type VaultStoreActions = {
  initForUser: (userId: string | null) => Promise<void>;
  refreshFromRemote: () => Promise<void>;
  addCycleRolloverDeposit: (params: {
    userId: string;
    sourceCycleId: string;
    amount: number;
    note?: string;
  }) => Promise<void>;
  setInitialBalance: (amount: number) => Promise<void>;
  recompute: () => void;
  resetForLogout: () => void;
};

export type VaultStore = VaultStoreState & VaultStoreActions;

const initialState: VaultStoreState = {
  userId: null,
  deposits: [],
  summary: null,
  isLoading: false,
  lastSyncedAt: null,
  logoutEpoch: 0,
};

/** Uses disposableIncome − cycle spend (same basis as `createNewCycleImmediate` rollover.savings). */
function mergeBackfillDeposits(
  existing: VaultDeposit[],
  budgetState: BudgetState,
  disposableIncome: number,
  userId: string,
): VaultDeposit[] {
  const sorted = [...budgetState.cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  const active = sorted[0];
  const now = new Date();
  const seenCycle = new Set(
    existing
      .filter((d) => d.source === "cycle_rollover" && d.sourceCycleId)
      .map((d) => d.sourceCycleId as string),
  );

  const additions: VaultDeposit[] = [];
  for (const c of budgetState.cycles) {
    if (active && c.id === active.id) continue;
    if (!isCycleEnded(c, now)) continue;
    if (seenCycle.has(c.id)) continue;
    const res = computeCycleRolloverDeposit(
      c.id,
      budgetState.transactions,
      disposableIncome,
    );
    if (!res) continue;
    // Match `isCycleEnded`: local end-of-day for `endDate`, then ISO for storage.
    const depositedAt = new Date(`${c.endDate}T23:59:59`).toISOString();
    additions.push({
      id: uuidv4(),
      userId,
      source: "cycle_rollover",
      amount: res.amount,
      sourceCycleId: c.id,
      note: `Cycle ${c.startDate} – ${c.endDate}`,
      depositedAt,
      createdAt: depositedAt,
    });
    seenCycle.add(c.id);
  }
  return additions;
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  ...initialState,

  recompute: () => {
    const { deposits } = get();
    set({ summary: computeVaultTotal(deposits) });
  },

  resetForLogout: () => {
    set((s) => ({
      ...initialState,
      logoutEpoch: s.logoutEpoch + 1,
    }));
  },

  initForUser: async (userId: string | null) => {
    if (!userId) {
      get().resetForLogout();
      return;
    }
    const epoch = get().logoutEpoch;
    set({ userId, isLoading: true });

    let deposits: VaultDeposit[] = [];
    try {
      const raw = await AsyncStorage.getItem(cacheKey(userId));
      if (raw) {
        deposits = JSON.parse(raw) as VaultDeposit[];
      }
    } catch {
      deposits = [];
    }

    if (get().logoutEpoch !== epoch) return;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("vault_deposits")
          .select("*")
          .eq("user_id", userId)
          .order("deposited_at", { ascending: true });

        if (get().logoutEpoch !== epoch) return;
        if (!error && data?.length) {
          deposits = data.map((r) => rowToDeposit(r as Record<string, unknown>));
        }
      } catch (e) {
        log.debug("vaultStore.fetch", String(e));
      }
    }

    if (get().logoutEpoch !== epoch) return;

    const budgetState = useBudgetStore.getState().state;
    if (budgetState?.cycles?.length) {
      try {
        const taxConfig = await getActiveTaxConfig();
        if (get().logoutEpoch !== epoch) return;
        const recurring = useRecurringExpensesStore.getState().recurringExpenses;
        const { disposableIncome } = getMonthlyDisposableIncome(
          budgetState.incomeSources,
          recurring,
          taxConfig,
        );
        const backfill = mergeBackfillDeposits(deposits, budgetState, disposableIncome, userId);
        if (backfill.length) {
          const preBackfillDeposits = deposits;
          deposits = sortDepositsMerge(deposits, backfill);
          await saveCache(userId, deposits);
          const backfillMutationIds: string[] = [];
          for (const d of backfill) {
            const m = await enqueueMutation(userId, {
              id: queueMutationId(),
              userId,
              createdAt: d.createdAt,
              kind: "insert_vault_deposit",
              payload: depositToInsertPayload(d),
            });
            backfillMutationIds.push(m.id);
          }
          const flushRes = await flushBudgetQueueUntilMutationIdsCleared(
            userId,
            backfillMutationIds,
          );
          if (!flushRes.ok) {
            const bfIds = new Set(backfill.map((d) => d.id));
            deposits = preBackfillDeposits.filter((d) => !bfIds.has(d.id));
            await removeQueuedMutationsByIds(userId, backfillMutationIds);
            await saveCache(userId, deposits);
            log.debug("vaultStore.backfillFlushFailed", flushRes.error);
          }
        }
      } catch (e) {
        log.debug("vaultStore.backfill", String(e));
      }
    }

    if (get().logoutEpoch !== epoch) return;

    await saveCache(userId, deposits);
    set({
      deposits,
      summary: computeVaultTotal(deposits),
      isLoading: false,
      lastSyncedAt: new Date().toISOString(),
    });
  },

  refreshFromRemote: async () => {
    const { userId } = get();
    if (!userId || !supabase) {
      get().recompute();
      return;
    }
    const epoch = get().logoutEpoch;
    try {
      const { data, error } = await supabase
        .from("vault_deposits")
        .select("*")
        .eq("user_id", userId)
        .order("deposited_at", { ascending: true });
      if (get().logoutEpoch !== epoch) return;
      if (error || !data) return;
      const remote = data.map((r) => rowToDeposit(r as Record<string, unknown>));
      const deposits = await mergeRemoteDepositsWithPendingQueue(userId, remote);
      await saveCache(userId, deposits);
      set({
        deposits,
        summary: computeVaultTotal(deposits),
        lastSyncedAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  },

  addCycleRolloverDeposit: async ({ userId, sourceCycleId, amount, note }) => {
    if (!userId || !sourceCycleId || amount <= 0) return;
    const { deposits, userId: uid } = get();
    if (uid !== userId) return;
    if (
      deposits.some(
        (d) => d.source === "cycle_rollover" && d.sourceCycleId === sourceCycleId,
      )
    ) {
      return;
    }
    const now = new Date().toISOString();
    const d: VaultDeposit = {
      id: uuidv4(),
      userId,
      source: "cycle_rollover",
      amount,
      sourceCycleId,
      note: note ?? null,
      depositedAt: now,
      createdAt: now,
    };
    const next = sortDepositsMerge(deposits, [d]);
    set({ deposits: next, summary: computeVaultTotal(next) });
    await saveCache(userId, next);
    const m = await enqueueMutation(userId, {
      id: queueMutationId(),
      userId,
      createdAt: now,
      kind: "insert_vault_deposit",
      payload: depositToInsertPayload(d),
    });
    const flushRes = await flushBudgetQueueUntilMutationIdsCleared(userId, [m.id]);
    if (!flushRes.ok) {
      const rolledBack = deposits.filter((x) => x.id !== d.id);
      set({ deposits: rolledBack, summary: computeVaultTotal(rolledBack) });
      await saveCache(userId, rolledBack);
      await removeQueuedMutationsByIds(userId, [m.id]);
      log.debug("vaultStore.addCycleRolloverDepositFlushFailed", flushRes.error);
    }
  },

  setInitialBalance: async (amount: number) => {
    const userId = get().userId;
    if (!userId) return;
    const safe = Math.max(0, Math.round(amount * 100) / 100);
    const now = new Date().toISOString();
    const prevDeposits = get().deposits;
    let { deposits } = get();
    const existing = deposits.find((d) => d.source === "initial");
    const mutationIds: string[] = [];

    const mProfile = await enqueueMutation(userId, {
      id: queueMutationId(),
      userId,
      createdAt: now,
      kind: "upsert_profile",
      payload: { id: userId, initial_savings_balance: safe },
    });
    mutationIds.push(mProfile.id);

    if (existing) {
      const next = deposits.map((d) =>
        d.id === existing.id ? { ...d, amount: safe, depositedAt: now } : d,
      );
      set({ deposits: next, summary: computeVaultTotal(next) });
      await saveCache(userId, next);
      const mVault = await enqueueMutation(userId, {
        id: queueMutationId(),
        userId,
        createdAt: now,
        kind: "update_vault_deposit",
        payload: {
          id: existing.id,
          user_id: userId,
          amount: safe,
          note: existing.note,
        },
      });
      mutationIds.push(mVault.id);
    } else {
      const d: VaultDeposit = {
        id: uuidv4(),
        userId,
        source: "initial",
        amount: safe,
        sourceCycleId: null,
        note: "Starting balance",
        depositedAt: now,
        createdAt: now,
      };
      const next = sortDepositsMerge(deposits, [d]);
      set({ deposits: next, summary: computeVaultTotal(next) });
      await saveCache(userId, next);
      const mVault = await enqueueMutation(userId, {
        id: queueMutationId(),
        userId,
        createdAt: now,
        kind: "insert_vault_deposit",
        payload: depositToInsertPayload(d),
      });
      mutationIds.push(mVault.id);
    }

    const flushRes = await flushBudgetQueueUntilMutationIdsCleared(userId, mutationIds);
    if (!flushRes.ok) {
      set({ deposits: prevDeposits, summary: computeVaultTotal(prevDeposits) });
      await saveCache(userId, prevDeposits);
      await removeQueuedMutationsByIds(userId, mutationIds);
      throw new Error(flushRes.error);
    }
  },
}));

function sortDepositsMerge(a: VaultDeposit[], b: VaultDeposit[]): VaultDeposit[] {
  return sortDepositsVaultLedgerOrder([...a, ...b]);
}
