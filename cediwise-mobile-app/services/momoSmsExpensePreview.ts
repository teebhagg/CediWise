import moment from "moment";

import type { MoMoSmsMessage } from "./momoSmsFilters";
import { normalizeSmsAddress, normalizeSmsBody, stripReferenceText } from "./momoSmsFilters";
import {
  formatSmsCategoryLabel,
  pickCategoryForSmsPreview,
  type SmsCategoryCandidate,
} from "./momoSmsCategoryRules";

type PreviewDirection = "expense" | "income" | "transfer" | "unknown";

type PreviewRule = {
  re: RegExp;
  direction: PreviewDirection;
  amountGroup?: number;
  counterpartyGroup?: number;
  txIdGroup?: number;
};

/**
 * Expense/income/transfer patterns aligned with the server Ghana MoMo parser.
 * Used only for on-device review UI before the user confirms import.
 */
// Kept as an export here for callers that already import it from the preview module.
export { stripReferenceText };

const PREVIEW_RULES: PreviewRule[] = [
  {
    re: /Payment made for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /Payment for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*(?:to\s+)?(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Ref\s*:|Transaction ID|\bon\s+\d{4}|\.|$))/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /You have successfully purchased GHS\s*([\d,]+(?:\.\d{1,2})?)\s+(.+?)(?=\s+on\s+\d{4}|\s+Ref\s*:|\.|$)/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /Payment received for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: "income",
    counterpartyGroup: 2,
  },
  {
    re: /Cash Out of GHS\s*([\d,]+(?:\.\d{1,2})?)/i,
    direction: "transfer",
  },
  {
    re: /Cash In of GHS\s*([\d,]+(?:\.\d{1,2})?)/i,
    direction: "transfer",
  },
  {
    re: /You have paid GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /Your payment of GHS\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)(?=\s+has been(?:\s+successfully)?\s+completed)/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /(\d{10,})\s+Confirmed\.\s*GHS\s*([\d,]+(?:\.\d{1,2})?)\s+sent to\s+(.+?)(?=\s+on\s+)/i,
    direction: "expense",
    amountGroup: 2,
    counterpartyGroup: 3,
    txIdGroup: 1,
  },
  {
    re: /(\d{10,})\s+Confirmed\.\s*GHS\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?received from\s+(.+?)(?=\s+on\s+|\.)/i,
    direction: "income",
    amountGroup: 2,
    counterpartyGroup: 3,
    txIdGroup: 1,
  },
  {
    re: /GHS\s*([\d,]+(?:\.\d{1,2})?)\s+sent to\s+(.+?)(?=\s+on\s+|\.)/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /You have sent GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\.|Your\s|Current\s+balance|Available\s+balance|$)/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
  {
    re: /You have received GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)(?=\.|Your\s)/i,
    direction: "income",
    counterpartyGroup: 2,
  },
  {
    re: /Vodafone Cash.*?GHS\s*([\d,]+(?:\.\d{1,2})?)\s*(?:sent|paid|debited)/i,
    direction: "expense",
  },
  // Wallet alerts worded "paid to" / "debited to" (AT Money and others) without a provider prefix.
  // Placed after the sent-to rules so explicit person-to-person wording still wins.
  {
    re: /GHS\s*([\d,]+(?:\.\d{1,2})?)\s+(?:paid|debited)\s+to\s+(.+?)(?=\s+on\s+\d{4}|\s+Ref\s*:|\.|$)/i,
    direction: "expense",
    counterpartyGroup: 2,
  },
];

export type SmsExpenseCaptureItem = {
  id: string;
  message: MoMoSmsMessage;
  /** Amount that will be saved on the budget transaction. */
  amount: number;
  /** Note that will be saved (`MoMo → counterparty`). */
  description: string;
  /** Category name that will be assigned on save. */
  categoryName: string;
  categoryId: string | null;
  /** "reversal" rows undo an earlier payment; they carry no category and no spend of their own. */
  eventType: "merchant_payment" | "bill_payment" | "airtime_data" | "p2p_send" | "reversal";
  classification: "expense" | "transfer" | null;
  /** Human-readable occurred-at label. */
  receivedAtLabel: string;
};

export type BuildSmsExpenseCaptureOptions = {
  categories?: SmsCategoryCandidate[];
  /** Inclusive lower bound (ms). Messages older than this are dropped. */
  minDateMs?: number;
  /** Inclusive upper bound (ms). Defaults to now. */
  maxDateMs?: number;
};

const TX_ID_PATTERNS = [
  /Financial\s+Transaction\s+Id[:\s]+(\d+)/i,
  /External\s+Transaction\s+Id[:\s]+(\d+)/i,
  /(?:Transaction\s+ID|Trans\.?\s*ID|Txn\s+ID)[:\s#]+(\d+)/i,
  /^(\d{10,})\s+Confirmed\./i,
] as const;

function extractTxId(text: string, fromPattern?: string | null): string | null {
  if (fromPattern) return fromPattern;
  for (const pattern of TX_ID_PATTERNS) {
    const hit = text.match(pattern)?.[1];
    if (hit) return hit;
  }
  return null;
}

function parseGhsAmount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function cleanCounterparty(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/\s*(?:Current|Available)\s+Balance.*$/i, "")
    .replace(/\s+on\s+(?:MTN|Telecel|Vodafone).*$/i, "")
    .trim();
  return cleaned || null;
}

/** Human-readable payment time for the review list. */
export function formatSmsExpenseDate(dateMs: number, nowMs: number = Date.now()): string {
  if (!Number.isFinite(dateMs)) return "Unknown date";
  const when = moment(dateMs);
  if (!when.isValid()) return "Unknown date";

  const now = moment(nowMs);
  if (when.isSame(now, "day")) {
    return `Today at ${when.format("h:mm A")}`;
  }
  if (when.isSame(now.clone().subtract(1, "day"), "day")) {
    return `Yesterday at ${when.format("h:mm A")}`;
  }
  if (when.isAfter(now.clone().subtract(6, "days").startOf("day"))) {
    return when.format("dddd [at] h:mm A");
  }
  if (when.isSame(now, "year")) {
    return when.format("D MMM [at] h:mm A");
  }
  return when.format("D MMM YYYY [at] h:mm A");
}

/** Mirrors server `buildNote` for the review list. */
function buildDescription(counterparty: string | null, txId: string | null): string {
  const who = counterparty?.trim() || "Unknown";
  const suffix = txId ? ` (#${txId})` : "";
  return `MoMo → ${who}${suffix}`;
}

export function previewSmsExpense(
  message: MoMoSmsMessage,
  categories: SmsCategoryCandidate[] = [],
): Omit<SmsExpenseCaptureItem, "id"> | null {
  const body = normalizeSmsBody(message.body);
  if (body.length < 10) return null;

  const ruleBody = stripReferenceText(body);
  for (const rule of PREVIEW_RULES) {
    const match = ruleBody.match(rule.re);
    if (!match) continue;
    if (rule.direction !== "expense") return null;

    const amountGroup = rule.amountGroup ?? 1;
    const amount = parseGhsAmount(match[amountGroup]);
    if (amount == null) return null;

    const counterparty =
      rule.counterpartyGroup != null
        ? cleanCounterparty(match[rule.counterpartyGroup] ?? null)
        : null;
    const patternTxId =
      rule.txIdGroup != null ? (match[rule.txIdGroup] ?? null) : null;
    const txId = extractTxId(body, patternTxId);
    const category = pickCategoryForSmsPreview(categories, counterparty, body);

    return {
      message: {
        address: normalizeSmsAddress(message.address) || message.address,
        body,
        date: message.date,
      },
      amount,
      description: buildDescription(counterparty, txId),
      categoryName: category
        ? formatSmsCategoryLabel(category.name)
        : "Uncategorized",
      categoryId: category?.id ?? null,
      // Person-to-person wording first: a recipient called "BILL" must not become a bill payment.
      eventType: /sent to|you have sent/i.test(body)
        ? "p2p_send"
        : /airtime|data bundle|bundle/i.test(body)
          ? "airtime_data"
          : /bill|utility/i.test(body)
            ? "bill_payment"
            : "merchant_payment",
      classification: /sent to|you have sent/i.test(body) ? null : "expense",
      receivedAtLabel: formatSmsExpenseDate(message.date),
    };
  }

  return null;
}

/** Build review-ready expense captures from filtered MoMo SMS rows. */
export function buildSmsExpenseCaptureItems(
  messages: MoMoSmsMessage[],
  options: BuildSmsExpenseCaptureOptions = {},
): SmsExpenseCaptureItem[] {
  const minDateMs = options.minDateMs ?? Number.NEGATIVE_INFINITY;
  const maxDateMs = options.maxDateMs ?? Date.now();
  const categories = options.categories ?? [];
  const items: SmsExpenseCaptureItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (message.date < minDateMs || message.date > maxDateMs) continue;
    const preview = previewSmsExpense(message, categories);
    if (!preview) continue;
    items.push({
      id: `${preview.message.date}-${i}-${preview.amount}`,
      ...preview,
    });
  }
  return items;
}
