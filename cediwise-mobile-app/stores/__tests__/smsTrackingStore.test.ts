/** @jest-environment node */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { SMS_TRACKING_STORAGE_KEY } from "@/constants/smsImport";
import {
  ensureAllProvidersEnabled,
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
