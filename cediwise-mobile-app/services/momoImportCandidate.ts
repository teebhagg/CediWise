import type { MoMoSmsMessage } from "./momoSmsFilters";
import { inferMoMoProviderFromContent, isMoMoTransactionBody, normalizeSmsBody } from "./momoSmsFilters";
import { previewSmsExpense, stripReferenceText } from "./momoSmsExpensePreview";
import { sha256Hex } from "@/utils/sha256";

export type MoMoProvider = "mtn_momo" | "telecel_cash" | "at_money";
export type MoMoEventType =
  | "merchant_payment" | "bill_payment" | "airtime_data" | "p2p_send"
  | "cash_out" | "bank_transfer" | "wallet_transfer" | "incoming"
  | "reversal" | "failed" | "pending" | "unknown";
export type MoMoClassification = "expense" | "transfer" | "ignored";

export type MoMoImportCandidate = {
  schemaVersion: 1;
  clientImportId: string;
  provider: MoMoProvider;
  eventType: MoMoEventType;
  principalPesewas: number | null;
  feePesewas: number;
  receivedAt: string;
  counterparty: string | null;
  receiptId: string | null;
  reversedReceiptId: string | null;
  parserVersion: "1";
  confidence: "high" | "medium" | "low";
  classification: MoMoClassification | null;
  categoryId: string | null;
  /** SHA-256 of normalized SMS text for compatibility with legacy dedupe keys. */
  legacyDedupeKey?: string;
};

function extractReceiptId(body: string): string | null {
  const patterns = [
    /Financial\s+Transaction\s+Id[:\s]+([A-Z0-9-]+)/i,
    /External\s+Transaction\s+Id[:\s]+([A-Z0-9-]+)/i,
    /(?:Transaction\s+ID|Trans\.?\s*ID|Txn\s+ID)[:\s#]+([A-Z0-9-]+)/i,
    /^([A-Z0-9]{10,})\s+Confirmed\./i,
  ];
  for (const pattern of patterns) {
    const value = body.match(pattern)?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function extractReversedReceiptId(body: string): string | null {
  const patterns = [
    /reversal\s+of\s+(?:the\s+)?(?:original\s+)?(?:transaction\s+)?(?:id|reference)\s*[:#]?\s*([A-Z0-9-]{4,})/i,
    /\b(?:reversed|reversal)\b[\s\S]{0,80}\boriginal\s+(?:transaction\s+)?(?:id|reference)\s*[:#]?\s*([A-Z0-9-]{4,})/i,
  ];
  for (const pattern of patterns) {
    const value = body.match(pattern)?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function amountToPesewas(value: string | undefined): number | null {
  const amount = Number((value ?? "0").replace(/,/g, ""));
  const pesewas = Math.round(amount * 100);
  return Number.isSafeInteger(pesewas) && pesewas >= 0 ? pesewas : null;
}

/** Amount of the transaction clause itself, ignoring balances quoted earlier in the text. */
function extractTransactionAmount(body: string): string | undefined {
  return body.match(
    /(?:Payment\s+(?:made\s+)?for|You\s+have\s+(?:successfully\s+)?(?:paid|sent|purchased)|payment\s+of|Cash\s+(?:Out|In)\s+of|Confirmed\.)\s*GHS\s*([\d,]+(?:\.\d{1,2})?)/i,
  )?.[1] ?? body.match(/GHS\s*([\d,]+(?:\.\d{1,2})?)\s+(?:sent|paid|debited)\b/i)?.[1];
}

function inferEventType(rawBody: string): MoMoEventType {
  const body = stripReferenceText(rawBody);
  if (/revers(?:al|ed)|reversal/i.test(body)) return "reversal";
  if (/failed|declined|unsuccessful/i.test(body)) return "failed";
  if (/pending|processing/i.test(body)) return "pending";
  if (/received|cash in/i.test(body)) return "incoming";
  if (/cash out|withdraw/i.test(body)) return "cash_out";
  if (/bank transfer|\bto\s+bank\b/i.test(body)) return "bank_transfer";
  if (/wallet transfer|own account/i.test(body)) return "wallet_transfer";
  if (/airtime|data bundle|bundle/i.test(body)) return "airtime_data";
  if (/bill|utility/i.test(body)) return "bill_payment";
  if (/sent to|you have sent/i.test(body)) return "p2p_send";
  if (/merchant|payment made|payment for|you have paid|your payment|purchased/i.test(body)) return "merchant_payment";
  return "unknown";
}

export function buildMoMoImportCandidate(
  message: MoMoSmsMessage,
  categoryId: string | null = null,
): MoMoImportCandidate | null {
  const provider = inferMoMoProviderFromContent(message.address, message.body);
  if (provider === "unknown") return null;
  const body = normalizeSmsBody(message.body);
  if (!isMoMoTransactionBody(body, message.address ?? undefined)) return null;
  if (!Number.isFinite(message.date) || message.date <= 0) return null;
  const receivedAt = new Date(message.date);
  if (!Number.isFinite(receivedAt.getTime())) return null;
  const preview = previewSmsExpense(message);
  const eventType = inferEventType(body);
  const amountMatch = eventType === "reversal"
    ? body.match(/GHS\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1]
    : extractTransactionAmount(stripReferenceText(body));
  const rawPrincipal = preview
    ? Math.round(preview.amount * 100)
    : amountMatch ? amountToPesewas(amountMatch) : null;
  if (rawPrincipal != null && !Number.isSafeInteger(rawPrincipal)) return null;
  // The server schema rejects a zero principal: drop the amount on reversals, skip other events.
  if (rawPrincipal === 0 && eventType !== "reversal") return null;
  const principalPesewas = rawPrincipal === 0 ? null : rawPrincipal;
  const feeMatch = body.match(/(?:Fee|You were charged)(?:\s+was)?[:\s]+GHS\s*([\d,]+(?:\.\d{1,2})?)/i);
  const feePesewas = feeMatch ? amountToPesewas(feeMatch[1]) : 0;
  if (feePesewas == null) return null;
  const reversedReceiptId = eventType === "reversal" ? extractReversedReceiptId(body) : null;
  const parsedReceiptId = extractReceiptId(body);
  const receiptId = eventType === "reversal" && parsedReceiptId === reversedReceiptId
    ? null
    : parsedReceiptId;
  const counterparty = preview?.description.replace(/^MoMo\s*→\s*/, "").replace(/\s*\(#.*\)$/, "") ?? null;
  const localIdentity = `${provider}|${receiptId ?? "no-ref"}|${message.date}|${sha256Hex(body)}`;
  const autoEligible = ["merchant_payment", "bill_payment", "airtime_data"].includes(eventType);
  const highConfidence = eventType === "reversal"
    ? reversedReceiptId != null
    : principalPesewas != null && principalPesewas > 0;
  return {
    schemaVersion: 1,
    clientImportId: `sms-${sha256Hex(localIdentity).slice(0, 32)}`,
    provider,
    eventType,
    principalPesewas,
    feePesewas,
    receivedAt: receivedAt.toISOString(),
    counterparty,
    receiptId,
    reversedReceiptId,
    parserVersion: "1",
    confidence: highConfidence ? "high" : "low",
    classification: autoEligible ? "expense" : null,
    categoryId,
  };
}
