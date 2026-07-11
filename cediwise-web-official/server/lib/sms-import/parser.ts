import type { ParsedSms, ParseConfidence, SmsDirection, SmsProvider } from './types'
import { sha256Hex } from './crypto'

type PatternRule = {
  re: RegExp
  direction: SmsDirection
  provider: SmsProvider
  /** Capture group index for amount (default 1). */
  amountGroup?: number
  counterpartyGroup?: number
  /** Capture group index for transaction / confirm ID. */
  txIdGroup?: number
}

/**
 * MTN MoMo patterns.
 * Counterparty stops before Current/Available Balance so names without a trailing
 * period still parse cleanly (common MTN format).
 */
const MTN_PATTERNS: PatternRule[] = [
  {
    re: /Payment made for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: 'expense',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
  {
    re: /Payment received for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: 'income',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
  {
    re: /Cash Out of GHS\s*([\d,]+(?:\.\d{1,2})?)/i,
    direction: 'expense',
    provider: 'mtn_momo',
  },
  {
    re: /Cash In of GHS\s*([\d,]+(?:\.\d{1,2})?)/i,
    direction: 'transfer',
    provider: 'mtn_momo',
  },
  {
    re: /You have paid GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\s*(?:Current\s+Balance|Available\s+Balance|Fee:|Reference:|Transaction ID|\.|$))/i,
    direction: 'expense',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
  {
    re: /Your payment of GHS\s*([\d,]+(?:\.\d{1,2})?)\s+to\s+(.+?)(?=\s+has been(?:\s+successfully)?\s+completed)/i,
    direction: 'expense',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
]

/**
 * Telecel Cash / Vodafone Cash patterns (including confirm-id style T-Cash SMS).
 * Example: "0000013645405283 Confirmed. GHS2.00 sent to 0534… - NAME on MTN …"
 */
const TELECEL_PATTERNS: PatternRule[] = [
  {
    re: /(\d{10,})\s+Confirmed\.\s*GHS\s*([\d,]+(?:\.\d{1,2})?)\s+sent to\s+(.+?)(?=\s+on\s+)/i,
    direction: 'expense',
    provider: 'telecel_cash',
    amountGroup: 2,
    counterpartyGroup: 3,
    txIdGroup: 1,
  },
  {
    re: /(\d{10,})\s+Confirmed\.\s*GHS\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?received from\s+(.+?)(?=\s+on\s+|\.)/i,
    direction: 'income',
    provider: 'telecel_cash',
    amountGroup: 2,
    counterpartyGroup: 3,
    txIdGroup: 1,
  },
  {
    re: /GHS\s*([\d,]+(?:\.\d{1,2})?)\s+sent to\s+(.+?)(?=\s+on\s+|\.)/i,
    direction: 'expense',
    provider: 'telecel_cash',
    counterpartyGroup: 2,
  },
  {
    re: /You have sent GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)(?=\.|Your\s)/i,
    direction: 'expense',
    provider: 'telecel_cash',
    counterpartyGroup: 2,
  },
  {
    re: /You have received GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)(?=\.|Your\s)/i,
    direction: 'income',
    provider: 'telecel_cash',
    counterpartyGroup: 2,
  },
  {
    re: /Vodafone Cash.*?GHS\s*([\d,]+(?:\.\d{1,2})?)\s*(?:sent|paid|debited)/i,
    direction: 'expense',
    provider: 'telecel_cash',
  },
]

const TX_ID_PATTERNS = [
  /Financial\s+Transaction\s+Id[:\s]+(\d+)/i,
  /External\s+Transaction\s+Id[:\s]+(\d+)/i,
  /(?:Transaction\s+ID|Trans\.?\s*ID|Txn\s+ID)[:\s#]+(\d+)/i,
  /^(\d{10,})\s+Confirmed\./i,
] as const
/** Prefer transfer charge; e-levy matched separately if needed. */
const FEE_RE =
  /(?:Fee|You were charged)(?:\s+was)?[:\s]+GHS\s*([\d,]+(?:\.\d{1,2})?)/i
const BALANCE_RE =
  /(?:Your\s+new\s+balance|Available\s+balance|Current\s+balance|Telecel\s+Cash\s+balance|balance)(?:\s+is)?[:\s]+GHS\s*([\d,]+(?:\.\d{1,2})?)/i
const REFERENCE_RE = /Reference[:\s#]+(\S+)/i

function extractTxId(text: string, fromPattern?: string | null): string | null {
  if (fromPattern) return fromPattern
  for (const pattern of TX_ID_PATTERNS) {
    const hit = text.match(pattern)?.[1]
    if (hit) return hit
  }
  return null
}

function extractReference(text: string): string | null {
  const raw = text.match(REFERENCE_RE)?.[1] ?? null
  if (!raw) return null
  const cleaned = raw.replace(/[.,;]+$/, '').trim()
  if (!cleaned || /^-+$/.test(cleaned)) return null
  return cleaned
}

function cleanCounterparty(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/\s*(?:Current|Available)\s+Balance.*$/i, '')
    .replace(/\s+on\s+(?:MTN|Telecel|Vodafone).*$/i, '')
    .trim()
  return cleaned || null
}

export function parseGhsAmount(raw: string | undefined | null): number | null {
  if (!raw) return null
  const normalized = raw.replace(/,/g, '').trim()
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function inferProvider(sender: string | undefined, text: string): SmsProvider {
  const haystack = `${sender ?? ''} ${text}`.toLowerCase()
  if (
    haystack.includes('telecel') ||
    haystack.includes('t-cash') ||
    haystack.includes('tcash') ||
    haystack.includes('vodafone cash') ||
    haystack.includes('vodafone')
  ) {
    return 'telecel_cash'
  }
  if (
    haystack.includes('mtn') ||
    haystack.includes('momo') ||
    haystack.includes('mobile money')
  ) {
    return 'mtn_momo'
  }
  if (haystack.includes('airteltigo') || haystack.includes('at money')) {
    return 'airteltigo_money'
  }
  return 'unknown'
}

function patternsForProvider(provider: SmsProvider): PatternRule[] {
  if (provider === 'telecel_cash') return TELECEL_PATTERNS
  if (provider === 'mtn_momo') return MTN_PATTERNS
  return [...MTN_PATTERNS, ...TELECEL_PATTERNS]
}

function emptyParsed(
  provider: SmsProvider,
  confidence: ParseConfidence = 'low',
): ParsedSms {
  return {
    provider,
    direction: 'unknown',
    amount: null,
    fee: null,
    counterparty: null,
    reference: null,
    txId: null,
    balanceAfter: null,
    confidence,
  }
}

export function parseGhanaMoMoSms(
  raw: string,
  sender?: string,
): ParsedSms {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length < 10) {
    return emptyParsed('unknown')
  }

  const providerHint = inferProvider(sender, text)
  const patterns = patternsForProvider(providerHint)

  for (const pattern of patterns) {
    const match = text.match(pattern.re)
    if (!match) continue

    const amountGroup = pattern.amountGroup ?? 1
    const amount = parseGhsAmount(match[amountGroup])
    const counterparty =
      pattern.counterpartyGroup != null
        ? cleanCounterparty(match[pattern.counterpartyGroup] ?? null)
        : null
    const patternTxId =
      pattern.txIdGroup != null ? (match[pattern.txIdGroup] ?? null) : null

    return {
      provider: pattern.provider,
      direction: pattern.direction,
      amount,
      fee: parseGhsAmount(text.match(FEE_RE)?.[1]),
      counterparty,
      reference: extractReference(text),
      txId: extractTxId(text, patternTxId),
      balanceAfter: parseGhsAmount(text.match(BALANCE_RE)?.[1]),
      confidence: amount != null ? 'high' : 'medium',
    }
  }

  return emptyParsed(providerHint)
}

/** True when the SMS body matches a known MTN or Telecel transaction alert format. */
export function isMoMoTransactionSms(raw: string, sender?: string): boolean {
  const parsed = parseGhanaMoMoSms(raw, sender)
  return (
    parsed.direction !== 'unknown' &&
    parsed.amount != null &&
    parsed.amount > 0
  )
}

export function buildDedupeKey(parsed: ParsedSms, rawMessage: string): string {
  if (parsed.txId && parsed.provider !== 'unknown') {
    return `${parsed.provider}:${parsed.txId}`
  }
  return `hash:${sha256Hex(rawMessage.replace(/\s+/g, ' ').trim())}`
}
