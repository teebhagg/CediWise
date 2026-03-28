/**
 * AsyncStorage layer for SME Ledger state + mutation queue.
 * Follows the same pattern as budgetStorage.ts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import type { SMEState, SMETransaction, SMECategory, SMEProfile } from "../types/sme";
import type { BudgetMutation, BudgetQueue } from "../types/budget";

const SME_STATE_KEY_PREFIX = "@cediwise_sme_state:";
const SME_QUEUE_KEY_PREFIX = "@cediwise_sme_queue:";

export const SME_CHANGED_EVENT = "cediwise_sme_changed";

function emitSMEChanged(userId: string) {
  try {
    DeviceEventEmitter.emit(SME_CHANGED_EVENT, { userId });
  } catch {
    // ignore
  }
}

function stateKey(userId: string) {
  return `${SME_STATE_KEY_PREFIX}${userId}`;
}

function queueKey(userId: string) {
  return `${SME_QUEUE_KEY_PREFIX}${userId}`;
}

// ─── State ──────────────────────────────────────────

export function createEmptySMEState(userId: string): SMEState {
  return {
    version: 1,
    userId,
    profile: null,
    transactions: [],
    categories: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadSMEState(userId: string): Promise<SMEState> {
  const raw = await AsyncStorage.getItem(stateKey(userId));
  if (!raw) return createEmptySMEState(userId);
  try {
    const parsed = JSON.parse(raw) as SMEState;
    if (parsed?.userId !== userId || parsed?.version !== 1) {
      return createEmptySMEState(userId);
    }
    return {
      ...parsed,
      profile: parsed.profile ?? null,
      transactions: parsed.transactions ?? [],
      categories: parsed.categories ?? [],
    };
  } catch {
    return createEmptySMEState(userId);
  }
}

export async function saveSMEState(next: SMEState): Promise<void> {
  const state: SMEState = { ...next, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(stateKey(state.userId), JSON.stringify(state));
  emitSMEChanged(state.userId);
}

export async function clearSMEState(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([stateKey(userId), queueKey(userId)]);
  emitSMEChanged(userId);
}

// ─── Queue (reuses BudgetMutation / BudgetQueue types) ─────────────

export function createEmptySMEQueue(userId: string): BudgetQueue {
  return {
    version: 1,
    userId,
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadSMEQueue(userId: string): Promise<BudgetQueue> {
  const raw = await AsyncStorage.getItem(queueKey(userId));
  if (!raw) return createEmptySMEQueue(userId);
  try {
    const parsed = JSON.parse(raw) as BudgetQueue;
    if (parsed?.userId !== userId || parsed?.version !== 1) {
      return createEmptySMEQueue(userId);
    }
    return parsed;
  } catch {
    return createEmptySMEQueue(userId);
  }
}

export async function saveSMEQueue(next: BudgetQueue): Promise<void> {
  const queue: BudgetQueue = { ...next, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(queueKey(queue.userId), JSON.stringify(queue));
}

export async function enqueueSMEMutation(
  userId: string,
  mutation: Omit<BudgetMutation, "retryCount">
): Promise<BudgetMutation> {
  const queue = await loadSMEQueue(userId);
  const item: BudgetMutation = {
    ...mutation,
    retryCount: 0,
  };
  queue.items.push(item);
  await saveSMEQueue(queue);
  return item;
}

export async function removeSMEQueuedMutation(
  userId: string,
  mutationId: string
): Promise<void> {
  const queue = await loadSMEQueue(userId);
  queue.items = queue.items.filter((m) => m.id !== mutationId);
  await saveSMEQueue(queue);
}

export async function updateSMEQueuedMutation(
  userId: string,
  mutationId: string,
  patch: Partial<BudgetMutation>
): Promise<void> {
  const queue = await loadSMEQueue(userId);
  const idx = queue.items.findIndex((m) => m.id === mutationId);
  if (idx !== -1) {
    queue.items[idx] = { ...queue.items[idx], ...patch };
    await saveSMEQueue(queue);
  }
}

export function makeQueueId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
