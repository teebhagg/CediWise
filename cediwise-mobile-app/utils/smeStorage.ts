/**
 * AsyncStorage layer for SME Ledger state + mutation queue.
 * Follows the same pattern as budgetStorage.ts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import type {
  DraftSMETransaction,
  PaymentMethod,
  SMEState,
  TransactionType,
} from "../types/sme";
import type { BudgetMutation, BudgetQueue } from "../types/budget";
import { calculateVAT } from "./vatEngine";

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

const PAYMENT_METHOD_VALUES: readonly PaymentMethod[] = [
  "cash",
  "momo",
  "bank",
  "card",
  "cheque",
  "other",
];

function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === "string" && PAYMENT_METHOD_VALUES.includes(v as PaymentMethod);
}

function normalizeLastUsedType(v: unknown): TransactionType | null {
  return v === "income" || v === "expense" ? v : null;
}

function parseFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Defensive restore of batch drafts from persisted JSON. */
export function normalizeDraftBatchTransactions(raw: unknown): DraftSMETransaction[] {
  if (!Array.isArray(raw)) return [];
  const out: DraftSMETransaction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const tempId =
      typeof o.tempId === "string" && o.tempId.length > 0 ? o.tempId : makeQueueId();
    const type = o.type === "income" || o.type === "expense" ? o.type : null;
    if (!type) continue;
    const amount = parseFiniteNumber(o.amount);
    if (amount === null || amount < 0) continue;
    const description = typeof o.description === "string" ? o.description : "";
    const category = typeof o.category === "string" ? o.category : "";
    const transactionDate =
      typeof o.transactionDate === "string" && o.transactionDate.length > 0
        ? o.transactionDate
        : new Date().toISOString().split("T")[0];
    const paymentMethod = isPaymentMethod(o.paymentMethod) ? o.paymentMethod : null;
    const vatApplicable = Boolean(o.vatApplicable);
    let vatAmount = parseFiniteNumber(o.vatAmount);
    if (vatAmount === null) {
      vatAmount = calculateVAT(amount, vatApplicable);
    }
    const notes =
      o.notes === null || o.notes === undefined
        ? null
        : typeof o.notes === "string"
          ? o.notes
          : null;
    out.push({
      tempId,
      type,
      amount,
      description,
      category,
      transactionDate,
      paymentMethod,
      vatApplicable,
      vatAmount,
      notes,
    });
  }
  return out;
}

// ─── State ──────────────────────────────────────────

export function createEmptySMEState(userId: string): SMEState {
  return {
    version: 1,
    userId,
    profile: null,
    transactions: [],
    categories: [],
    draftBatchTransactions: [],
    lastUsedType: null,
    lastUsedCategory: null,
    lastUsedPaymentMethod: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function loadSMEState(userId: string): Promise<SMEState> {
  const raw = await AsyncStorage.getItem(stateKey(userId));
  if (!raw) return createEmptySMEState(userId);
  try {
    const parsed = JSON.parse(raw) as Partial<SMEState>;
    if (parsed?.userId !== userId || parsed?.version !== 1) {
      return createEmptySMEState(userId);
    }
    return {
      version: 1,
      userId,
      profile: parsed.profile ?? null,
      transactions: parsed.transactions ?? [],
      categories: parsed.categories ?? [],
      draftBatchTransactions: normalizeDraftBatchTransactions(parsed.draftBatchTransactions),
      lastUsedType: normalizeLastUsedType(parsed.lastUsedType),
      lastUsedCategory:
        typeof parsed.lastUsedCategory === "string" && parsed.lastUsedCategory.length > 0
          ? parsed.lastUsedCategory
          : null,
      lastUsedPaymentMethod: isPaymentMethod(parsed.lastUsedPaymentMethod)
        ? parsed.lastUsedPaymentMethod
        : null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
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
