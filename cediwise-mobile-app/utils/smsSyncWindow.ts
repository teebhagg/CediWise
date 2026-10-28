import { SMS_IMPORT_SYNC_WINDOW_MS } from "@/constants/smsImport";

/**
 * Lower bound for SMS sync: later of lookback window start and profile creation.
 * Never imports MoMo SMS from before the CediWise profile existed.
 */
export function resolveSmsSyncMinDateMs(
  nowMs: number,
  profileCreatedAtMs: number | null,
  lookbackMs: number = SMS_IMPORT_SYNC_WINDOW_MS,
): number {
  const windowStart = nowMs - lookbackMs;
  if (profileCreatedAtMs == null || !Number.isFinite(profileCreatedAtMs)) {
    return windowStart;
  }
  return Math.max(windowStart, profileCreatedAtMs);
}
