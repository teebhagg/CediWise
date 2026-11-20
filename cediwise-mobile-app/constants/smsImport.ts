/** MoMo SMS import — API URL, sync window, sender heuristics, feature flag env key. */

/** Limit background catch-up and default scans to the recent 48-hour window. */
export const SMS_IMPORT_SYNC_WINDOW_MS = 48 * 60 * 60 * 1000;

export const SMS_IMPORT_LIVE_DEBOUNCE_MS = 5_000;

/**
 * Foreground catch-up: max inbox lookback when Auto-add is on.
 * Covers MoMo payments made while CediWise was paused (listener unregisters on pause).
 */
export const SMS_IMPORT_LIVE_CATCHUP_MAX_MS = 2 * 60 * 60 * 1000;

/** First catch-up after enabling Auto-add (avoid dumping days of inbox). */
export const SMS_IMPORT_LIVE_CATCHUP_INITIAL_MS = 30 * 60 * 1000;

/** Overlap when using last catch-up watermark so boundary SMS are not missed. */
export const SMS_IMPORT_LIVE_CATCHUP_OVERLAP_MS = 60_000;

export const SMS_LIVE_CATCHUP_STORAGE_KEY = "@cediwise/sms_live_catchup_v1";

export const SMS_IMPORT_BATCH_MAX = 100;

export const MOMO_SMS_LIVE_IMPORT_FLAG = "momo_sms_live_import" as const;

export const SMS_TRACKING_STORAGE_KEY = "@cediwise/sms_tracking_v1";

/**
 * Sender address substrings for Ghana MoMo alert SMS (case-insensitive).
 * Includes carrier names and common short-code patterns.
 */
export const ALL_MOMO_NETWORKS = ["mtn_momo", "telecel_cash", "at_money"] as const;

export type MoMoNetworkId = (typeof ALL_MOMO_NETWORKS)[number];

export function isAlwaysIncludedMoMoNetwork(
  id: string,
): id is MoMoNetworkId {
  return (ALL_MOMO_NETWORKS as readonly string[]).includes(id);
}

export function getScanButtonState(
  scanningInbox: boolean,
  savingReview: boolean,
): {
  disabled: boolean;
  title: string;
  accessibilityLabel: string;
  showSpinner: boolean;
} {
  return {
    disabled: scanningInbox || savingReview,
    title: scanningInbox ? "Scanning…" : "Scan SMS",
    accessibilityLabel: scanningInbox
      ? "Scanning messages"
      : "Scan SMS",
    showSpinner: scanningInbox,
  };
}

export const PASTE_TOO_SHORT_MESSAGE = "Paste the full SMS text";

export const MOMO_SENDER_HINTS = [
  "MTN",
  "MOMO",
  "TELECEL",
  "T-CASH",
  "TCASH",
  "VODAFONE",
  "AIRTELTIGO",
  "AT MONEY",
  "AT-MONEY",
  "MOBILE MONEY",
  "MOBILEMONEY",
] as const;

export function getSmsImportApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SMS_IMPORT_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : "";
}

/**
 * Android background SMS capture: the native receiver, the JS live listener and the automatic
 * inbox catch-up on foreground. Turned off for now. Manual history scans are not affected.
 * Re-enable only after the Android release, policy and device-readiness checks in the MoMo import
 * docs pass.
 */
export const ANDROID_AUTOMATIC_CAPTURE_ENABLED = false;

export function isMoMoSmsLiveImportEnvEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_MOMO_SMS_LIVE_IMPORT;
  return raw === "1" || raw === "true";
}
