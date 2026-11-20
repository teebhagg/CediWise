import { z } from 'zod'

const MIN_SMS_TIMESTAMP = Date.UTC(2000, 0, 1)
const MAX_FUTURE_SMS_SKEW_MS = 24 * 60 * 60 * 1000

function isPlausibleSmsTimestamp(value: string): boolean {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) &&
    timestamp >= MIN_SMS_TIMESTAMP &&
    timestamp <= Date.now() + MAX_FUTURE_SMS_SKEW_MS
}

const smsReceivedAtSchema = z.string()
  .datetime({ offset: true })
  .refine(isPlausibleSmsTimestamp, 'Timestamp must be between 2000 and 24 hours in the future')

const smsSenderSchema = z.string()
  .trim()
  .min(1)
  .max(200)
  .refine((sender) => !Array.from(sender).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
  }), 'Sender contains control characters')

export type SmsDirection = 'expense' | 'income' | 'transfer' | 'unknown'
export type SmsProvider = 'mtn_momo' | 'telecel_cash' | 'at_money' | 'unknown'
export type ParseConfidence = 'high' | 'medium' | 'low'
export type SmsEventType =
  | 'merchant_payment'
  | 'bill_payment'
  | 'airtime_data'
  | 'p2p_send'
  | 'cash_out'
  | 'bank_transfer'
  | 'wallet_transfer'
  | 'incoming'
  | 'reversal'
  | 'failed'
  | 'pending'
  | 'unknown'

export type ParsedSms = {
  provider: SmsProvider
  direction: SmsDirection
  amount: number | null
  fee: number | null
  counterparty: string | null
  reference: string | null
  txId: string | null
  balanceAfter: number | null
  confidence: ParseConfidence
  eventType?: SmsEventType
}

export type ImportStatus =
  | 'parsed'
  | 'duplicate'
  | 'skipped'
  | 'failed'
  | 'needs_review'
  | 'retryable'
  | 'reversed'

export const structuredCandidateSchema = z.object({
  schemaVersion: z.literal(1),
  clientImportId: z.string().trim().min(8).max(128),
  provider: z.enum(['mtn_momo', 'telecel_cash', 'at_money']),
  eventType: z.enum([
    'merchant_payment', 'bill_payment', 'airtime_data', 'p2p_send',
    'cash_out', 'bank_transfer', 'wallet_transfer', 'incoming',
    'reversal', 'failed', 'pending', 'unknown',
  ]),
  principalPesewas: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  feePesewas: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  receivedAt: smsReceivedAtSchema,
  counterparty: z.string().trim().max(200).nullable(),
  receiptId: z.string().trim().max(128).nullable(),
  reversedReceiptId: z.string().trim().max(128).nullable().default(null),
  parserVersion: z.string().trim().min(1).max(32),
  confidence: z.enum(['high', 'medium', 'low']),
  classification: z.enum(['expense', 'transfer', 'ignored']).nullable().default(null),
  categoryId: z.string().uuid().nullable().default(null),
  // Opaque compatibility key for old raw-import rows; never contains SMS text.
  legacyDedupeKey: z.string().regex(/^hash:[a-f0-9]{64}$/i).optional(),
}).strict().superRefine((candidate, context) => {
  if (candidate.eventType === 'reversal' && !candidate.reversedReceiptId) {
    // Keep an unlinked reversal eligible for review, but never apply it to an
    // arbitrary expense. The RPC records it as needs_review.
    return
  }
  if (candidate.eventType !== 'reversal' && candidate.principalPesewas == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['principalPesewas'],
      message: 'Expense candidates require a principal amount',
    })
  }
})

export type StructuredCandidate = z.infer<typeof structuredCandidateSchema>

export const smsMessageSchema = z.object({
  message: z.string().trim().min(10).max(4000),
  sender: smsSenderSchema.optional(),
  receivedAt: smsReceivedAtSchema.optional(),
})

export const smsImportBodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    webhookApiKey: z.string().min(10).optional(),
    message: z.string().trim().min(10).max(4000).optional(),
    sender: smsSenderSchema.optional(),
    receivedAt: smsReceivedAtSchema.optional(),
    messages: z.array(smsMessageSchema).min(1).max(100).optional(),
    candidate: structuredCandidateSchema.optional(),
    candidates: z.array(structuredCandidateSchema).min(1).max(100).optional(),
  })
  .refine((data) => Boolean(data.message) || Boolean(data.messages?.length) || Boolean(data.candidate) || Boolean(data.candidates?.length), {
    message: 'Provide message, messages, candidate, or candidates',
  })

export type SmsImportBody = z.infer<typeof smsImportBodySchema>

export type SmsImportResult = {
  ok: true
  status: ImportStatus
  importLogId?: string
  transactionId?: string
  feeTransactionId?: string
  parsed?: ParsedSms
  error?: string
  /** Present on unexpected server failures; callers may retry the item. */
  errorCode?: 'internal_error' | 'no_active_budget_cycle' | 'client_import_conflict'
  retryable?: boolean
}

export type SmsImportBatchResult = {
  ok: true
  results: Array<SmsImportResult>
  summary: {
    total: number
    parsed: number
    duplicate: number
    skipped: number
    failed: number
    needs_review: number
    retryable: number
    reversed: number
  }
}
