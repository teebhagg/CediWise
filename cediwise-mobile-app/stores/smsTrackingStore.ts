import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  ALL_MOMO_NETWORKS,
  SMS_TRACKING_STORAGE_KEY,
} from "@/constants/smsImport";

export type SmsTrackingPersistedState = {
  optedIn: boolean;
  liveListenerEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncSummary: {
    found: number;
    parsed: number;
    duplicate: number;
    skipped: number;
    failed: number;
    needsReview: number;
    retryable: number;
    reversed: number;
    noActiveBudgetCycle?: boolean;
  } | null;
  providers: {
    mtn_momo: boolean;
    telecel_cash: boolean;
    at_money: boolean;
  };
};

type SmsTrackingStore = SmsTrackingPersistedState & {
  hydrated: boolean;
  /** Resolves true only when this user's persisted state was accepted into the store. */
  hydrate: (userId: string) => Promise<boolean>;
  setOptedIn: (userId: string, optedIn: boolean) => Promise<void>;
  setLiveListenerEnabled: (userId: string, enabled: boolean) => Promise<void>;
  setProviderEnabled: (userId: string, provider: keyof SmsTrackingPersistedState["providers"], enabled: boolean) => Promise<void>;
  recordSyncSummary: (
    userId: string,
    summary: NonNullable<SmsTrackingPersistedState["lastSyncSummary"]>,
  ) => Promise<void>;
  resetForUser: (userId: string | null) => Promise<void>;
};

const DEFAULT_STATE: SmsTrackingPersistedState = {
  optedIn: false,
  liveListenerEnabled: false,
  lastSyncAt: null,
  lastSyncSummary: null,
  providers: { mtn_momo: true, telecel_cash: true, at_money: true },
};

function storageKey(userId: string): string {
  return `${SMS_TRACKING_STORAGE_KEY}:${userId}`;
}

async function readPersisted(userId: string): Promise<SmsTrackingPersistedState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<SmsTrackingPersistedState>;
    return {
      optedIn: parsed.optedIn === true,
      liveListenerEnabled: parsed.liveListenerEnabled === true,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      lastSyncSummary:
        parsed.lastSyncSummary && typeof parsed.lastSyncSummary === "object"
          ? {
              found: Number(parsed.lastSyncSummary.found) || 0,
              parsed: Number(parsed.lastSyncSummary.parsed) || 0,
              duplicate: Number(parsed.lastSyncSummary.duplicate) || 0,
              skipped: Number(parsed.lastSyncSummary.skipped) || 0,
              failed: Number(parsed.lastSyncSummary.failed) || 0,
              needsReview: Number(parsed.lastSyncSummary.needsReview) || 0,
              retryable: Number(parsed.lastSyncSummary.retryable) || 0,
              reversed: Number(parsed.lastSyncSummary.reversed) || 0,
              noActiveBudgetCycle: parsed.lastSyncSummary.noActiveBudgetCycle === true,
            }
          : null,
      providers: {
        mtn_momo: parsed.providers?.mtn_momo !== false,
        telecel_cash: parsed.providers?.telecel_cash !== false,
        at_money: parsed.providers?.at_money !== false,
      },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function ensureAllProvidersEnabled(
  state: SmsTrackingPersistedState,
): { next: SmsTrackingPersistedState; changed: boolean } {
  const changed = ALL_MOMO_NETWORKS.some((id) => !state.providers[id]);
  if (!changed) return { next: state, changed: false };
  return {
    next: {
      ...state,
      providers: { mtn_momo: true, telecel_cash: true, at_money: true },
    },
    changed: true,
  };
}

async function writePersisted(
  userId: string,
  state: SmsTrackingPersistedState,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
}

/** Bumped on every state change so stale async completions can be discarded. */
let stateGeneration = 0;
let activeUserId: string | null = null;
let inflightHydration: { userId: string; promise: Promise<boolean> } | null = null;
/** Bumped by resetForUser so a setter that was waiting on hydration can tell logout ran meanwhile. */
let resetGeneration = 0;

/** The user whose tracking state the store currently holds, or null after logout. */
export function getActiveTrackingUserId(): string | null {
  return activeUserId;
}

/** Let a pending read for this user finish so a write never starts from unread defaults. */
async function settleHydration(userId: string): Promise<void> {
  const pending = inflightHydration;
  if (!pending || pending.userId !== userId) return;
  try {
    await pending.promise;
  } catch {
    // A failed read leaves defaults in place; the caller's write still proceeds.
  }
}

export const useSmsTrackingStore = create<SmsTrackingStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: (userId: string) => {
    // Concurrent callers for the same user share one read, so none can report "ready"
    // while another read is still pending and the store holds defaults.
    if (inflightHydration?.userId === userId && activeUserId === userId) {
      return inflightHydration.promise;
    }
    activeUserId = userId;
    const generation = ++stateGeneration;
    const promise = (async (): Promise<boolean> => {
      const persisted = await readPersisted(userId);
      const { next, changed } = ensureAllProvidersEnabled(persisted);
      // A logout, account switch or newer consent change happened while reading: drop this result.
      if (generation !== stateGeneration || activeUserId !== userId) return false;
      if (changed) {
        await writePersisted(userId, next);
        if (generation !== stateGeneration || activeUserId !== userId) return false;
      }
      set({ ...next, hydrated: true });
      return true;
    })();
    const entry = { userId, promise };
    inflightHydration = entry;
    const clear = () => {
      if (inflightHydration === entry) inflightHydration = null;
    };
    promise.then(clear, clear);
    return promise;
  },

  setOptedIn: async (userId: string, optedIn: boolean) => {
    const resetAtStart = resetGeneration;
    await settleHydration(userId);
    // Logout or an account reset ran while waiting: do not write this user's state back.
    if (resetAtStart !== resetGeneration) return;
    const next: SmsTrackingPersistedState = {
      ...get(),
      optedIn,
      liveListenerEnabled: optedIn ? get().liveListenerEnabled : false,
    };
    if (activeUserId !== null && activeUserId !== userId) return;
    activeUserId = userId;
    stateGeneration += 1;
    set(next);
    await writePersisted(userId, next);
  },

  setLiveListenerEnabled: async (userId: string, enabled: boolean) => {
    const resetAtStart = resetGeneration;
    await settleHydration(userId);
    // Logout or an account reset ran while waiting: do not write this user's state back.
    if (resetAtStart !== resetGeneration) return;
    const next: SmsTrackingPersistedState = {
      ...get(),
      liveListenerEnabled: enabled,
    };
    if (activeUserId !== null && activeUserId !== userId) return;
    activeUserId = userId;
    stateGeneration += 1;
    set(next);
    await writePersisted(userId, next);
  },

  setProviderEnabled: async (userId, provider, enabled) => {
    const resetAtStart = resetGeneration;
    await settleHydration(userId);
    // Logout or an account reset ran while waiting: do not write this user's state back.
    if (resetAtStart !== resetGeneration) return;
    const next: SmsTrackingPersistedState = {
      ...get(),
      providers: { ...get().providers, [provider]: enabled },
    };
    if (activeUserId !== null && activeUserId !== userId) return;
    activeUserId = userId;
    stateGeneration += 1;
    set(next);
    await writePersisted(userId, next);
  },

  recordSyncSummary: async (userId, summary) => {
    // An import started by another account must not write into the current account's settings.
    if (activeUserId !== userId) return;
    const next: SmsTrackingPersistedState = {
      ...get(),
      lastSyncAt: new Date().toISOString(),
      lastSyncSummary: summary,
    };
    stateGeneration += 1;
    set(next);
    await writePersisted(userId, next);
  },

  resetForUser: async (userId) => {
    stateGeneration += 1;
    resetGeneration += 1;
    activeUserId = null;
    inflightHydration = null;
    set({ ...DEFAULT_STATE, hydrated: false });
    if (userId) {
      await AsyncStorage.removeItem(storageKey(userId));
    }
  },
}));
