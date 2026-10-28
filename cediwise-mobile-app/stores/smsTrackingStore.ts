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
  hydrate: (userId: string) => Promise<void>;
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

export const useSmsTrackingStore = create<SmsTrackingStore>((set, get) => ({
  ...DEFAULT_STATE,
  hydrated: false,

  hydrate: async (userId: string) => {
    const persisted = await readPersisted(userId);
    const { next, changed } = ensureAllProvidersEnabled(persisted);
    if (changed) {
      await writePersisted(userId, next);
    }
    set({ ...next, hydrated: true });
  },

  setOptedIn: async (userId: string, optedIn: boolean) => {
    const next: SmsTrackingPersistedState = {
      ...get(),
      optedIn,
      liveListenerEnabled: optedIn ? get().liveListenerEnabled : false,
    };
    set(next);
    await writePersisted(userId, next);
  },

  setLiveListenerEnabled: async (userId: string, enabled: boolean) => {
    const next: SmsTrackingPersistedState = {
      ...get(),
      liveListenerEnabled: enabled,
    };
    set(next);
    await writePersisted(userId, next);
  },

  setProviderEnabled: async (userId, provider, enabled) => {
    const next: SmsTrackingPersistedState = {
      ...get(),
      providers: { ...get().providers, [provider]: enabled },
    };
    set(next);
    await writePersisted(userId, next);
  },

  recordSyncSummary: async (userId, summary) => {
    const next: SmsTrackingPersistedState = {
      ...get(),
      lastSyncAt: new Date().toISOString(),
      lastSyncSummary: summary,
    };
    set(next);
    await writePersisted(userId, next);
  },

  resetForUser: async (userId) => {
    set({ ...DEFAULT_STATE, hydrated: false });
    if (userId) {
      await AsyncStorage.removeItem(storageKey(userId));
    }
  },
}));
