import type { ParsedSms, ParseConfidence, SmsDirection, SmsProvider } from './types'
import { sha256Hex } from './crypto'

type PatternRule = {
  re: RegExp
  direction: SmsDirection
  provider: SmsProvider
  counterpartyGroup?: number
}

const MTN_PATTERNS: PatternRule[] = [
  {
    re: /Payment made for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)\./i,
    direction: 'expense',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
  {
    re: /Payment received for GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)\./i,
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
    re: /You have paid GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)\./i,
    direction: 'expense',
    provider: 'mtn_momo',
    counterpartyGroup: 2,
  },
]

const TELECEL_PATTERNS: PatternRule[] = [
  {
    re: /You have sent GHS\s*([\d,]+(?:\.\d{1,2})?)\s*to\s*(.+?)\./i,
    direction: 'expense',
    provider: 'telecel_cash',
    counterpartyGroup: 2,
  },
  {
    re: /You have received GHS\s*([\d,]+(?:\.\d{1,2})?)\s*from\s*(.+?)\./i,
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

const TX_ID_RE =
  /(?:Transaction ID|Trans ID|Trans\.?\s*ID|Txn ID)[:\s#]+(\d+)/i
const FEE_RE = /Fee[:\s]+GHS\s*([\d,]+(?:\.\d{1,2})?)/i
const BALANCE_RE =
  /(?:Available balance|Current balance|balance)[:\s]+GHS\s*([\d,]+(?:\.\d{1,2})?)/i
const REFERENCE_RE = /Reference[:\s#]+(\S+)/i

function extractTxId(text: string): string | null {
  return text.match(TX_ID_RE)?.[1] ?? null
}

function extractReference(text: string): string | null {
  return text.match(REFERENCE_RE)?.[1] ?? null
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

    const amount = parseGhsAmount(match[1])
    const counterparty =
      pattern.counterpartyGroup != null
        ? (match[pattern.counterpartyGroup]?.trim() ?? null)
        : null

    return {
      provider: pattern.provider,
      direction: pattern.direction,
      amount,
      fee: parseGhsAmount(text.match(FEE_RE)?.[1]),
      counterparty,
      reference: extractReference(text),
      txId: extractTxId(text),
      balanceAfter: parseGhsAmount(text.match(BALANCE_RE)?.[1]),
      confidence: amount != null ? 'high' : 'medium',
    }
  }

  return emptyParsed(providerHint)
}

export function buildDedupeKey(parsed: ParsedSms, rawMessage: string): string {
  if (parsed.txId && parsed.provider !== 'unknown') {
    return `${parsed.provider}:${parsed.txId}`
  }
  return `hash:${sha256Hex(rawMessage.replace(/\s+/g, ' ').trim())}`
}
