import Constants from "expo-constants";
import { Platform } from "react-native";

import { SMS_IMPORT_SYNC_WINDOW_MS } from "@/constants/smsImport";
import { log } from "@/utils/logger";

import {
  filterMoMoSmsMessages,
  type MoMoSmsMessage,
  normalizeSmsAddress,
  normalizeSmsBody,
} from "./momoSmsFilters";
import { getReadSmsPermissionGranted } from "./androidSmsPermissions";

type RawInboxRow = {
  address?: string;
  body?: string;
  date?: number | string;
};

type SmsAndroidModule = {
  list: (
    filter: string,
    failCallback: (error: string) => void,
    successCallback: (count: number, smsList: string) => void,
  ) => void;
};

function resolveSmsAndroidModule(): SmsAndroidModule | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-get-sms-android") as
    | SmsAndroidModule
    | { default?: SmsAndroidModule };
  if ("list" in mod && typeof mod.list === "function") return mod;
  const resolved = "default" in mod ? mod.default : undefined;
  return resolved && typeof resolved.list === "function" ? resolved : null;
}

function getSmsAndroidModule(): SmsAndroidModule | null {
  if (Platform.OS !== "android") return null;
  if ((Constants.appOwnership ?? "") === "expo") return null;

  try {
    return resolveSmsAndroidModule();
  } catch (error) {
    log.warn("androidSmsReader: native module unavailable", error);
    return null;
  }
}

function normalizeInboxRow(row: RawInboxRow): MoMoSmsMessage | null {
  const body = normalizeSmsBody(row.body);
  const address = normalizeSmsAddress(row.address);
  const dateRaw = row.date;
  const date =
    typeof dateRaw === "number"
      ? dateRaw
      : typeof dateRaw === "string"
        ? Number(dateRaw)
        : NaN;

  if (!body || !Number.isFinite(date)) return null;
  return { address, body, date };
}

function listInboxSince(minDateMs: number, maxDateMs: number): Promise<MoMoSmsMessage[]> {
  const SmsAndroid = getSmsAndroidModule();
  if (!SmsAndroid) {
    return Promise.reject(new Error("sms_reader_unavailable"));
  }

  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify({
        box: "inbox",
        minDate: minDateMs,
        maxDate: maxDateMs,
      }),
      (error) => reject(new Error(error || "sms_list_failed")),
      (_count, smsList) => {
        try {
          const parsed = JSON.parse(smsList) as RawInboxRow[];
          const rows = (Array.isArray(parsed) ? parsed : [])
            .map(normalizeInboxRow)
            .filter((row): row is MoMoSmsMessage => row != null);
          resolve(rows);
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
}

export async function queryMoMoSmsSince(
  minDateMs: number,
  maxDateMs: number = Date.now(),
): Promise<MoMoSmsMessage[]> {
  if (Platform.OS !== "android") return [];

  const permission = await getReadSmsPermissionGranted();
  if (!permission) {
    throw new Error("sms_permission_denied");
  }

  const inbox = await listInboxSince(minDateMs, maxDateMs);
  return filterMoMoSmsMessages(inbox, { minDateMs, maxDateMs });
}

export async function queryLast48hMoMoSms(): Promise<MoMoSmsMessage[]> {
  const minDateMs = Date.now() - SMS_IMPORT_SYNC_WINDOW_MS;
  return queryMoMoSmsSince(minDateMs);
}

export type SmsReaderUnavailableReason = "expo_go" | "native_module_missing";

export function getSmsReaderUnavailableReason(): SmsReaderUnavailableReason | null {
  if (Platform.OS !== "android") return null;
  if ((Constants.appOwnership ?? "") === "expo") return "expo_go";
  if (getSmsAndroidModule() == null) return "native_module_missing";
  return null;
}

export function isAndroidSmsReaderAvailable(): boolean {
  return getSmsAndroidModule() != null;
}
