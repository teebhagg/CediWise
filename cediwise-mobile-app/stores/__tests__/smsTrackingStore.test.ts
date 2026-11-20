/** @jest-environment node */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { SMS_TRACKING_STORAGE_KEY } from "@/constants/smsImport";
import {
  ensureAllProvidersEnabled,
  getActiveTrackingUserId,
  useSmsTrackingStore,
} from "../smsTrackingStore";

const USER_ID = "user-sms-1";

function storageKey(userId: string): string {
  return `${SMS_TRACKING_STORAGE_KEY}:${userId}`;
}

describe("ensureAllProvidersEnabled", () => {
  it("forces mixed stored flags to all on and reports a change", () => {
    const { next, changed } = ensureAllProvidersEnabled({
      optedIn: true,
      liveListenerEnabled: true,
      lastSyncAt: null,
      lastSyncSummary: null,
      providers: { mtn_momo: true, telecel_cash: false, at_money: false },
    });
    expect(changed).toBe(true);
    expect(next.providers).toEqual({
      mtn_momo: true,
      telecel_cash: true,
      at_money: true,
    });
  });

  it("does not rewrite when all flags are already on", () => {
    const state = {
      optedIn: false,
      liveListenerEnabled: false,
      lastSyncAt: null,
      lastSyncSummary: null,
      providers: { mtn_momo: true, telecel_cash: true, at_money: true },
    };
    expect(ensureAllProvidersEnabled(state)).toEqual({ next: state, changed: false });
  });
});

describe("smsTrackingStore.hydrate", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSmsTrackingStore.setState({
      optedIn: false,
      liveListenerEnabled: false,
      lastSyncAt: null,
      lastSyncSummary: null,
      providers: { mtn_momo: true, telecel_cash: true, at_money: true },
      hydrated: false,
    });
  });

  it("writes all three networks on when storage had a false flag", async () => {
    await AsyncStorage.setItem(
      storageKey(USER_ID),
      JSON.stringify({
        optedIn: true,
        liveListenerEnabled: true,
        lastSyncAt: null,
        lastSyncSummary: null,
        providers: { mtn_momo: false, telecel_cash: true, at_money: true },
      }),
    );

    await useSmsTrackingStore.getState().hydrate(USER_ID);

    expect(useSmsTrackingStore.getState().providers).toEqual({
      mtn_momo: true,
      telecel_cash: true,
      at_money: true,
    });
    const persisted = JSON.parse(
      (await AsyncStorage.getItem(storageKey(USER_ID))) ?? "{}",
    );
    expect(persisted.providers).toEqual({
      mtn_momo: true,
      telecel_cash: true,
      at_money: true,
    });
  });
});

describe("smsTrackingStore concurrent hydration", () => {
  const persistedState = {
    optedIn: true,
    liveListenerEnabled: true,
    lastSyncAt: "2026-07-08T15:19:00.000Z",
    lastSyncSummary: null,
    providers: { mtn_momo: true, telecel_cash: true, at_money: true },
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    await useSmsTrackingStore.getState().resetForUser(null);
    await AsyncStorage.setItem(storageKey(USER_ID), JSON.stringify(persistedState));
  });

  it("shares one read between same-user callers and reports the accepted result to both", async () => {
    const store = useSmsTrackingStore.getState();
    const first = store.hydrate(USER_ID);
    const second = store.hydrate(USER_ID);
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(useSmsTrackingStore.getState().optedIn).toBe(true);
  });

  it("reports a discarded result as not accepted when another user takes over", async () => {
    const store = useSmsTrackingStore.getState();
    const stale = store.hydrate(USER_ID);
    const other = store.hydrate("user-sms-2");
    expect(await stale).toBe(false);
    expect(await other).toBe(true);
  });

  it("keeps unread settings when consent changes while hydration is pending", async () => {
    const store = useSmsTrackingStore.getState();
    const hydrating = store.hydrate(USER_ID);
    await store.setOptedIn(USER_ID, true);
    await hydrating;
    const state = useSmsTrackingStore.getState();
    expect(state.liveListenerEnabled).toBe(true);
    expect(state.lastSyncAt).toBe(persistedState.lastSyncAt);
    expect(state.hydrated).toBe(true);
    const saved = JSON.parse((await AsyncStorage.getItem(storageKey(USER_ID))) ?? "{}");
    expect(saved.liveListenerEnabled).toBe(true);
  });

  it("does not write a waiting setter's state back after logout resets the store", async () => {
    const store = useSmsTrackingStore.getState();
    const hydrating = store.hydrate(USER_ID);
    const setting = store.setOptedIn(USER_ID, true);
    await store.resetForUser(null);
    await Promise.all([hydrating, setting]);

    expect(getActiveTrackingUserId()).toBeNull();
    expect(useSmsTrackingStore.getState().optedIn).toBe(false);
    const saved = JSON.parse((await AsyncStorage.getItem(storageKey(USER_ID))) ?? "{}");
    expect(saved.optedIn).toBe(true); // the pre-existing persisted value is untouched, not rewritten
  });
});
