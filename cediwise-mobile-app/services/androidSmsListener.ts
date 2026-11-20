import Constants from "expo-constants";
import { Platform } from "react-native";

import { SMS_IMPORT_LIVE_DEBOUNCE_MS } from "@/constants/smsImport";
import { log } from "@/utils/logger";

import {
  buildLiveImportDedupeKey,
  isLikelyMoMoSms,
  type MoMoSmsMessage,
  normalizeSmsAddress,
  normalizeSmsBody,
} from "./momoSmsFilters";

export type IncomingMoMoSmsHandler = (message: MoMoSmsMessage) => void;

type CancellableSubscription = { remove: () => void };

let activeSubscription: CancellableSubscription | null = null;
let activeHandler: IncomingMoMoSmsHandler | null = null;
const recentPostAt = new Map<string, number>();

function getSmsListenerModule() {
  if (Platform.OS !== "android") return null;
  if ((Constants.appOwnership ?? "") === "expo") return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-android-sms-listener")
      .default as {
      addListener: (
        listener: (message: {
          originatingAddress: string;
          body: string;
          timestamp: number;
        }) => void,
      ) => CancellableSubscription;
    };
  } catch (error) {
    log.warn("androidSmsListener: native module unavailable", error);
    return null;
  }
}

function shouldEmit(message: MoMoSmsMessage): boolean {
  const key = buildLiveImportDedupeKey(message);
  const now = Date.now();
  const last = recentPostAt.get(key);
  if (last != null && now - last < SMS_IMPORT_LIVE_DEBOUNCE_MS) {
    return false;
  }
  recentPostAt.set(key, now);
  return true;
}

export function isAndroidSmsListenerAvailable(): boolean {
  return getSmsListenerModule() != null;
}

export function startMoMoSmsListener(handler: IncomingMoMoSmsHandler): boolean {
  if (Platform.OS !== "android") return false;

  const SmsListener = getSmsListenerModule();
  if (!SmsListener) return false;

  stopMoMoSmsListener();
  activeHandler = handler;

  activeSubscription = SmsListener.addListener((raw) => {
    const message: MoMoSmsMessage = {
      address: normalizeSmsAddress(raw.originatingAddress),
      body: normalizeSmsBody(raw.body),
      date: raw.timestamp,
    };

    if (!isLikelyMoMoSms(message)) return;
    if (!shouldEmit(message)) return;

    try {
      activeHandler?.(message);
    } catch (error) {
      log.warn("androidSmsListener: handler failed", error);
    }
  });

  return true;
}

export function stopMoMoSmsListener(): void {
  activeSubscription?.remove();
  activeSubscription = null;
  activeHandler = null;
}

export function clearMoMoSmsListenerDebounce(): void {
  recentPostAt.clear();
}

export function isMoMoSmsListenerActive(): boolean {
  return activeSubscription != null;
}
