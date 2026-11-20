import type { MoMoSmsMessage } from "@/services/momoSmsFilters";

export const IOS_MOMO_HISTORY_MAX_MESSAGES = 10;
export const IOS_MOMO_HISTORY_MAX_DAYS = 30;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_TOTAL_LENGTH = 12_000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type ShortcutHistoryParams = {
  message?: string | string[];
  sender?: string | string[];
  date?: string | string[];
};

export type ShortcutHistoryParseResult =
  | { ok: true; messages: MoMoSmsMessage[] }
  | {
      ok: false;
      reason:
        | "missing_fields"
        | "too_many_messages"
        | "payload_too_large"
        | "invalid_message"
        | "invalid_date"
        | "outside_window";
    };

function asValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? [value] : [];
}

/** Parse the repeated, URL-encoded query fields emitted by the iOS history Shortcut. */
export function parseShortcutHistoryParams(
  params: ShortcutHistoryParams,
  nowMs: number = Date.now(),
): ShortcutHistoryParseResult {
  const bodies = asValues(params.message);
  const senders = asValues(params.sender);
  const dates = asValues(params.date);

  if (bodies.length === 0 || senders.length !== bodies.length || dates.length !== bodies.length) {
    return { ok: false, reason: "missing_fields" };
  }
  if (bodies.length > IOS_MOMO_HISTORY_MAX_MESSAGES) {
    return { ok: false, reason: "too_many_messages" };
  }

  const totalLength = bodies.reduce((total, body, index) => {
    return total + body.length + (senders[index]?.length ?? 0) + (dates[index]?.length ?? 0);
  }, 0);
  if (totalLength > MAX_TOTAL_LENGTH) {
    return { ok: false, reason: "payload_too_large" };
  }

  const minDateMs = nowMs - IOS_MOMO_HISTORY_MAX_DAYS * 24 * 60 * 60 * 1000;
  const messages: MoMoSmsMessage[] = [];

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index]?.trim() ?? "";
    const address = senders[index]?.trim() ?? "";
    const dateValue = dates[index]?.trim() ?? "";
    const date = Date.parse(dateValue);

    if (!body || body.length > MAX_MESSAGE_LENGTH || !address || address.length > 160) {
      return { ok: false, reason: "invalid_message" };
    }
    if (!Number.isFinite(date)) return { ok: false, reason: "invalid_date" };
    if (date < minDateMs || date > nowMs + FUTURE_TOLERANCE_MS) {
      return { ok: false, reason: "outside_window" };
    }

    messages.push({ body, address, date });
  }

  return { ok: true, messages };
}
