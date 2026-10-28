import { Platform, PermissionsAndroid } from "react-native";

import { log } from "@/utils/logger";

export type SmsPermissionStatus = "granted" | "denied" | "blocked" | "unavailable";

type AndroidPermissionResult = "granted" | "denied" | "never_ask_again";

export type SmsPermissionSnapshot = {
  status: SmsPermissionStatus;
  readSms: AndroidPermissionResult | "unavailable";
  receiveSms: AndroidPermissionResult | "unavailable";
};

const READ_SMS = PermissionsAndroid.PERMISSIONS.READ_SMS;
const RECEIVE_SMS = PermissionsAndroid.PERMISSIONS.RECEIVE_SMS;

function isGranted(status: string): boolean {
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

function isBlocked(status: string): boolean {
  return status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
}

function toSnapshot(
  readSms: AndroidPermissionResult | "unavailable",
  receiveSms: AndroidPermissionResult | "unavailable",
): SmsPermissionSnapshot {
  if (readSms === "unavailable") {
    return { status: "unavailable", readSms, receiveSms };
  }

  if (readSms === "granted") {
    return { status: "granted", readSms, receiveSms };
  }

  if (readSms === "never_ask_again") {
    return { status: "blocked", readSms, receiveSms };
  }

  return { status: "denied", readSms, receiveSms };
}

export function isAndroidSmsSupported(): boolean {
  return Platform.OS === "android";
}

export async function getReadSmsPermissionGranted(): Promise<boolean> {
  if (!isAndroidSmsSupported()) return false;

  try {
    return await PermissionsAndroid.check(READ_SMS);
  } catch {
    return false;
  }
}

export async function getReceiveSmsPermissionGranted(): Promise<boolean> {
  if (!isAndroidSmsSupported()) return false;

  try {
    return await PermissionsAndroid.check(RECEIVE_SMS);
  } catch {
    return false;
  }
}

/** @deprecated Prefer getReadSmsPermissionGranted for sync/read flows. */
export async function getSmsPermissionStatus(): Promise<SmsPermissionStatus> {
  if (!isAndroidSmsSupported()) return "unavailable";
  return (await getReadSmsPermissionGranted()) ? "granted" : "denied";
}

async function requestSinglePermission(
  permission: typeof READ_SMS | typeof RECEIVE_SMS,
): Promise<AndroidPermissionResult | "unavailable"> {
  if (!isAndroidSmsSupported()) return "unavailable";

  try {
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) return "granted";

    // No rationale here — the in-app disclosure dialog already explains why we need SMS.
    const result = await PermissionsAndroid.request(permission);
    if (isGranted(result)) return "granted";
    if (isBlocked(result)) return "never_ask_again";
    return "denied";
  } catch (error) {
    log.warn("androidSmsPermissions: request failed", { permission, error });
    return "denied";
  }
}

/** Request only inbox access for a user-initiated scan or tracking opt-in. */
export async function requestReadSmsPermission(): Promise<SmsPermissionSnapshot> {
  if (!isAndroidSmsSupported()) {
    return {
      status: "unavailable",
      readSms: "unavailable",
      receiveSms: "unavailable",
    };
  }

  try {
    const receiveAlready = await PermissionsAndroid.check(RECEIVE_SMS);
    const readResult = await requestSinglePermission(READ_SMS);
    const snapshot = toSnapshot(readResult, receiveAlready ? "granted" : "denied");
    log.info("androidSmsPermissions: read permission result", snapshot);
    return snapshot;
  } catch (error) {
    log.warn("androidSmsPermissions: read permission request failed", error);
    return toSnapshot("denied", (await getReceiveSmsPermissionGranted()) ? "granted" : "denied");
  }
}

/** Request RECEIVE_SMS only after the separate auto-add disclosure is accepted. */
export async function requestReceiveSmsPermission(): Promise<SmsPermissionSnapshot> {
  if (!isAndroidSmsSupported()) {
    return {
      status: "unavailable",
      readSms: "unavailable",
      receiveSms: "unavailable",
    };
  }

  try {
    const readAlready = await PermissionsAndroid.check(READ_SMS);
    const receiveResult = await requestSinglePermission(RECEIVE_SMS);
    const snapshot = toSnapshot(
      readAlready ? "granted" : "denied",
      receiveResult,
    );
    log.info("androidSmsPermissions: receive permission result", snapshot);
    return snapshot;
  } catch (error) {
    log.warn("androidSmsPermissions: receive permission request failed", error);
    return toSnapshot(
      (await getReadSmsPermissionGranted()) ? "granted" : "denied",
      "denied",
    );
  }
}

/** @deprecated Use requestReadSmsPermission; background capture has its own prompt. */
export const requestSmsPermissions = requestReadSmsPermission;
