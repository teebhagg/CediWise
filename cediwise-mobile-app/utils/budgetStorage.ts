import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import type { BudgetMutation, BudgetQueue, BudgetState } from "../types/budget";

const STATE_KEY_PREFIX = "@cediwise_budget_state:";
const QUEUE_KEY_PREFIX = "@cediwise_budget_queue:";

export const BUDGET_CHANGED_EVENT = "cediwise_budget_changed";

/** When set, skip emitting BUDGET_CHANGED_EVENT for this userId. Used during vitals batch to avoid reload storm. */
let suppressBudgetEmitForUser: string | null = null;

/** Suppress or resume budget change emissions. Call from vitals before/after batch; emit once at end. */
export function setSuppressBudgetEmit(userId: string | null): void {
  suppressBudgetEmitForUser = userId;
}

function emitBudgetChanged(userId: string) {
  if (suppressBudgetEmitForUser === userId) return;
  try {
    DeviceEventEmitter.emit(BUDGET_CHANGED_EVENT, { userId });
  } catch {
    // ignore event emitter failures
  }
}

/** Force emit BUDGET_CHANGED_EVENT. Call after vitals batch when suppress was used. */
export function emitBudgetChangedNow(userId: string): void {
  try {
    DeviceEventEmitter.emit(BUDGET_CHANGED_EVENT, { userId });
  } catch {
    // ignore
  }
}

function stateKey(userId: string) {
  return `${STATE_KEY_PREFIX}${userId}`;
}

function queueKey(userId: string) {
  return `${QUEUE_KEY_PREFIX}${userId}`;
}

export function createEmptyBudgetState(userId: string): BudgetState {
  const now = new Date().toISOString();
  return {
    version: 1,
    userId,
    prefs: {},
    incomeSources: [],
    cycles: [],
    categories: [],
    transactions: [],
    updatedAt: now,
  };
}

export function createEmptyQueue(userId: string): BudgetQueue {
  const now = new Date().toISOString();
  return {
    version: 1,
    userId,
    items: [],
    updatedAt: now,
  };
}

export async function loadBudgetState(userId: string): Promise<BudgetState> {
  const raw = await AsyncStorage.getItem(stateKey(userId));
  if (!raw) {
    return createEmptyBudgetState(userId);
  }
  try {
    const parsed = JSON.parse(raw) as BudgetState;
    if (parsed?.userId !== userId || parsed?.version !== 1) {
      return createEmptyBudgetState(userId);
    }

    // Back-compat: older local data may contain a "utilities" bucket.
    // In v1, utilities are treated as part of needs.
    const normalizeBucket = (b: any) => (b === "utilities" ? "needs" : b);
    const normalized: BudgetState = {
      ...parsed,
      categories: (parsed.categories ?? []).map((c: any) => ({
        ...c,
        bucket: normalizeBucket(c.bucket),
      })),
      transactions: (parsed.transactions ?? []).map((t: any) => ({
        ...t,
        bucket: normalizeBucket(t.bucket),
      })),
    };

    return normalized;
  } catch {
    return createEmptyBudgetState(userId);
  }
}

export async function saveBudgetState(next: BudgetState): Promise<void> {
  const state: BudgetState = { ...next, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(stateKey(state.userId), JSON.stringify(state));
  emitBudgetChanged(state.userId);
}

export async function loadBudgetQueue(userId: string): Promise<BudgetQueue> {
  const raw = await AsyncStorage.getItem(queueKey(userId));
  if (!raw) {
    return createEmptyQueue(userId);
  }
  try {
    const parsed = JSON.parse(raw) as BudgetQueue;
    if (parsed?.userId !== userId || parsed?.version !== 1) {
      return createEmptyQueue(userId);
    }
    return parsed;
  } catch {
    return createEmptyQueue(userId);
  }
}

export async function saveBudgetQueue(next: BudgetQueue): Promise<void> {
  const queue: BudgetQueue = { ...next, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(queueKey(queue.userId), JSON.stringify(queue));
  emitBudgetChanged(queue.userId);
}

export async function enqueueMutation(
  userId: string,
  mutation: Omit<BudgetMutation, "retryCount">
): Promise<BudgetMutation> {
  const queue = await loadBudgetQueue(userId);
  const item: BudgetMutation = {
    ...mutation,
    retryCount: 0,
  };
  const next: BudgetQueue = { ...queue, items: [item, ...queue.items] };
  await saveBudgetQueue(next);
  return item;
}

export async function updateQueuedMutation(
  userId: string,
  id: string,
  patch: Partial<
    Pick<BudgetMutation, "retryCount" | "lastAttemptAt" | "lastError">
  >
): Promise<void> {
  const queue = await loadBudgetQueue(userId);
  const nextItems = queue.items.map((it) =>
    it.id === id ? { ...it, ...patch } : it
  );
  await saveBudgetQueue({ ...queue, items: nextItems });
}

export async function removeQueuedMutation(
  userId: string,
  id: string
): Promise<void> {
  const queue = await loadBudgetQueue(userId);
  const nextItems = queue.items.filter((it) => it.id !== id);
  await saveBudgetQueue({ ...queue, items: nextItems });
}

export async function clearBudgetLocal(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([stateKey(userId), queueKey(userId)]);
  emitBudgetChanged(userId);
}
