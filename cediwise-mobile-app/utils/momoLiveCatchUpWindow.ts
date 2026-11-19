import {
  SMS_IMPORT_LIVE_CATCHUP_INITIAL_MS,
  SMS_IMPORT_LIVE_CATCHUP_MAX_MS,
  SMS_IMPORT_LIVE_CATCHUP_OVERLAP_MS,
} from "@/constants/smsImport";

/**
 * Lower bound for Auto-add inbox catch-up on app foreground.
 * Prefer last catch-up watermark (minus overlap), capped by max lookback.
 * With no watermark, use a short initial window only.
 */
export function resolveLiveCatchUpMinDateMs(
  nowMs: number,
  lastCatchUpAtMs: number | null,
  options?: {
    maxLookbackMs?: number;
    initialLookbackMs?: number;
    overlapMs?: number;
  },
): number {
  const maxLookbackMs = options?.maxLookbackMs ?? SMS_IMPORT_LIVE_CATCHUP_MAX_MS;
  const initialLookbackMs =
    options?.initialLookbackMs ?? SMS_IMPORT_LIVE_CATCHUP_INITIAL_MS;
  const overlapMs = options?.overlapMs ?? SMS_IMPORT_LIVE_CATCHUP_OVERLAP_MS;

  const floor = nowMs - maxLookbackMs;

  if (lastCatchUpAtMs == null || !Number.isFinite(lastCatchUpAtMs)) {
    return Math.max(floor, nowMs - initialLookbackMs);
  }

  // A watermark ahead of now (device clock moved back) must not invert the interval.
  return Math.min(nowMs, Math.max(floor, lastCatchUpAtMs - overlapMs));
}
