import { z } from 'zod'

export type SmsDirection = 'expense' | 'income' | 'transfer' | 'unknown'
export type SmsProvider =
  | 'mtn_momo'
  | 'telecel_cash'
  | 'airteltigo_money'
  | 'unknown'
export type ParseConfidence = 'high' | 'medium' | 'low'

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
}

export type ImportStatus = 'parsed' | 'duplicate' | 'skipped' | 'failed'

export const smsMessageSchema = z.object({
  message: z.string().trim().min(10),
  sender: z.string().trim().optional(),
  receivedAt: z.string().trim().optional(),
})

export const smsImportBodySchema = z
  .object({
    userId: z.string().uuid().optional(),
    webhookApiKey: z.string().min(10).optional(),
    message: z.string().trim().min(10).optional(),
    sender: z.string().trim().optional(),
    receivedAt: z.string().trim().optional(),
    messages: z.array(smsMessageSchema).min(1).max(100).optional(),
  })
  .refine((data) => Boolean(data.message) || Boolean(data.messages?.length), {
    message: 'Provide message or messages',
  })

export type SmsImportBody = z.infer<typeof smsImportBodySchema>

export type SmsImportResult = {
  ok: true
  status: ImportStatus
  importLogId?: string
  transactionId?: string
  parsed?: ParsedSms
  error?: string
  /** Present on unexpected server failures; callers may retry the item. */
  errorCode?: 'internal_error'
  retryable?: boolean
}

export type SmsImportBatchResult = {
  ok: true
  results: SmsImportResult[]
  summary: {
    total: number
    parsed: number
    duplicate: number
    skipped: number
    failed: number
  }
}
