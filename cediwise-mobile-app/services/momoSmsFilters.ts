import {
  isAlwaysIncludedMoMoNetwork,
  MOMO_SENDER_HINTS,
} from "../constants/smsImport";

export type MoMoSmsMessage = {
  address?: string | null;
  body: string;
  date: number;
};

/**
 * Successful wallet-outflow patterns aligned with the server parser.
 * Matching requires a recognised Ghana MoMo sender as well as a provider-specific
 * transaction body, so unrelated messages never leave the device.
 */
const MTN_TRANSACTION_PATTERNS = [
  /Payment\s+made\s+for\s+GHS\s*[\d,.]+/i,
  /Payment\s+for\s+GHS\s*[\d,.]+/i,
  /You\s+have\s+successfully\s+purchased\s+GHS\s*[\d,.]+/i,
  /Cash\s+Out\s+of\s+GHS\s*[\d,.]+/i,
  /You\s+have\s+paid\s+GHS\s*[\d,.]+/i,
  /Your\s+payment\s+of\s+GHS\s*[\d,.]+\s+to\s+.+?\s+has\s+been(?:\s+successfully)?\s+completed/i,
] as const;

const TELECEL_TRANSACTION_PATTERNS = [
  /\d{10,}\s+Confirmed\.\s*GHS\s*[\d,.]+\s+sent\s+to/i,
  /You\s+have\s+sent\s+GHS\s*[\d,.]+/i,
  /GHS\s*[\d,.]+\s+sent\s+to\s+/i,
  /Vodafone\s+Cash.*?GHS\s*[\d,.]+\s*(?:sent|paid|debited)/i,
] as const;

const AT_MONEY_TRANSACTION_PATTERNS = [
  /You\s+have\s+sent\s+GHS\s*[\d,.]+/i,
  /Payment\s+made\s+for\s+GHS\s*[\d,.]+/i,
  /Your\s+payment\s+of\s+GHS\s*[\d,.]+\s+to\s+.+?\s+has\s+been(?:\s+successfully)?\s+completed/i,
  /GHS\s*[\d,.]+\s+(?:sent|paid|debited)\s+to\s+/i,
  /Cash\s+Out\s+of\s+GHS\s*[\d,.]+/i,
] as const;

const TRANSACTION_PATTERNS = [
  ...MTN_TRANSACTION_PATTERNS,
  ...TELECEL_TRANSACTION_PATTERNS,
  ...AT_MONEY_TRANSACTION_PATTERNS,
] as const;

const NON_TRANSACTION_PATTERNS = [
  /\bOTP\b/i,
  /verification\s+code/i,
  /one[\s-]?time\s+password/i,
  /\b(?:failed|declined|unsuccessful|pending|processing|cancelled|canceled)\b/i,
] as const;
const REVERSAL_PATTERN = /\b(?:reversal|reversed)\b/i;
const REVERSAL_REFERENCE_PATTERN = /\b(?:original\s+(?:transaction\s+)?(?:id|reference)|reversal\s+of\s+(?:transaction\s+)?(?:id|reference))\s*[:#]?\s*[A-Z0-9-]{4,}/i;

type SenderProvider = "mtn_momo" | "telecel_cash" | "at_money" | "unknown";

export function normalizeSmsAddress(address: string | undefined | null): string {
  return (address ?? "").trim();
}

/**
 * Uppercase sender and strip spaces/punctuation so variants like
 * "MobileMoney", "Mobile Money", and "AT-Money" match the same allowlist hints.
 */
export function canonicalizeSmsSender(address: string | undefined | null): string {
  return normalizeSmsAddress(address)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Drop free-text reference fields so words or amounts quoted there ("goods received",
 * "Payment for GHS 1.00") cannot change the direction or the principal. The field runs to the end
 * of the sentence, so a decimal point inside it ("12.50") does not end it early.
 */
export function stripReferenceText(body: string): string {
  return body.replace(/\bRef(?:erence)?\s*:.*?(?:\.(?=\s|$)|$)/gi, " ");
}

export function normalizeSmsBody(body: string | undefined | null): string {
  return (body ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The Shortcut sender for pasted text, but only while that text is still the Shortcut message.
 * Whitespace-only edits keep it; replacing the message drops it, so a sender is never attached to
 * a different SMS.
 */
export function resolvePastedSender(
  source: { sender: string; body: string } | null,
  pastedText: string,
): string | undefined {
  if (!source || !source.sender) return undefined;
  return normalizeSmsBody(pastedText) === source.body ? source.sender : undefined;
}

export function isLikelyMoMoSender(address: string): boolean {
  return inferMoMoSender(address) !== "unknown";
}

/** Inbox scan always includes every supported network. Stored flags are ignored. */
export function isScanEligibleSender(address: string | undefined | null): boolean {
  return isAlwaysIncludedMoMoNetwork(inferMoMoSender(address ?? ""));
}

/**
 * Identify the network from the message text when no sender name was supplied.
 * Distinctive sentences are checked before shared ones.
 */
const BODY_STRUCTURE_RULES: {
  provider: Exclude<SenderProvider, "unknown">;
  re: RegExp;
}[] = [
  { provider: "telecel_cash", re: /\d{10,}\s+Confirmed\.\s*GHS/i },
  { provider: "mtn_momo", re: /You\s+have\s+successfully\s+purchased\s+GHS/i },
  { provider: "mtn_momo", re: /Payment\s+for\s+GHS/i },
  { provider: "mtn_momo", re: /Payment\s+made\s+for\s+GHS/i },
  { provider: "mtn_momo", re: /You\s+have\s+paid\s+GHS/i },
  { provider: "mtn_momo", re: /Your\s+payment\s+of\s+GHS/i },
  { provider: "mtn_momo", re: /Cash\s+Out\s+of\s+GHS/i },
  { provider: "at_money", re: /You\s+have\s+sent\s+GHS/i },
  { provider: "telecel_cash", re: /GHS\s*[\d,.]+\s+sent\s+to/i },
];

export function inferMoMoProviderFromContent(
  address: string | undefined | null,
  body: string | undefined | null,
): SenderProvider {
  const fromAddress = inferMoMoSender(address ?? "");
  if (fromAddress !== "unknown") return fromAddress;
  const text = normalizeSmsBody(body);
  const confirmId = BODY_STRUCTURE_RULES[0];
  if (confirmId && confirmId.re.test(text)) return confirmId.provider;
  const fromBodyName = inferMoMoSender(text);
  if (fromBodyName !== "unknown") return fromBodyName;
  return BODY_STRUCTURE_RULES.slice(1).find((rule) => rule.re.test(text))?.provider ?? "unknown";
}

export function inferMoMoSender(address: string): SenderProvider {
  const canonical = canonicalizeSmsSender(address);
  if (
    !canonical ||
    !MOMO_SENDER_HINTS.some((hint) => canonical.includes(canonicalizeSmsSender(hint)))
  ) {
    return "unknown";
  }
  if (canonical.includes("TELECEL") || canonical.includes("VODAFONE") || canonical.includes("TCASH")) return "telecel_cash";
  if (canonical.includes("AIRTELTIGO") || canonical.includes("ATMONEY")) {
    return "at_money";
  }
  // MOBILEMONEY must be checked explicitly: it does not contain the substring "MOMO".
  if (
    canonical.includes("MTN") ||
    canonical.includes("MOMO") ||
    canonical.includes("MOBILEMONEY")
  ) {
    return "mtn_momo";
  }
  return "unknown";
}

function patternsForSender(provider: SenderProvider) {
  if (provider === "mtn_momo") return MTN_TRANSACTION_PATTERNS;
  if (provider === "telecel_cash") return TELECEL_TRANSACTION_PATTERNS;
  if (provider === "at_money") return AT_MONEY_TRANSACTION_PATTERNS;
  return TRANSACTION_PATTERNS;
}

export function isMoMoTransactionBody(body: string, sender?: string): boolean {
  const text = normalizeSmsBody(body);
  if (text.length < 20) return false;
  const isReversal = REVERSAL_PATTERN.test(text);
  if (!/GHS/i.test(text) && !(isReversal && REVERSAL_REFERENCE_PATTERN.test(text))) return false;
  const provider = sender ? inferMoMoSender(normalizeSmsAddress(sender)) : "unknown";
  // Status words inside a free-text reference ("Reference: pending invoice") do not make a
  // successful payment pending; only the transaction clause is checked.
  const withoutReference = stripReferenceText(text);
  if (NON_TRANSACTION_PATTERNS.some((pattern) => pattern.test(withoutReference))) {
    return false;
  }
  if (isReversal) return true;
  if (!patternsForSender(provider).some((pattern) => pattern.test(text))) return false;
  return true;
}

/** True when the SMS is a recognised MTN, Telecel, or AT Money wallet-outflow alert. */
export function isLikelyMoMoSms(message: {
  address?: string | null;
  body: string;
}): boolean {
  return (
    isLikelyMoMoSender(normalizeSmsAddress(message.address)) &&
    isMoMoTransactionBody(message.body, message.address ?? undefined)
  );
}

export function filterMoMoSmsMessages<T extends MoMoSmsMessage>(
  messages: T[],
  options: { minDateMs: number; maxDateMs?: number },
): T[] {
  const maxDateMs = options.maxDateMs ?? Date.now();
  return messages
    .filter((row) => {
      if (row.date < options.minDateMs || row.date > maxDateMs) return false;
      return isLikelyMoMoSms(row);
    })
    .sort((a, b) => b.date - a.date);
}

export function buildLiveImportDedupeKey(message: MoMoSmsMessage): string {
  return `${normalizeSmsAddress(message.address)}:${normalizeSmsBody(message.body)}`;
}
