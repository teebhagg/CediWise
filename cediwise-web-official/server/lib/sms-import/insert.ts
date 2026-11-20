import { pickCategoryForSms } from './categoryRules'
import { buildDedupeKey, parseGhanaMoMoSms } from './parser'
import { hmacSha256Hex } from './crypto'
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { ImportStatus, ParsedSms, SmsImportResult, StructuredCandidate } from './types'

type ImportMessageInput = {
  message: string
  sender?: string
  receivedAt?: string
}

type ImportLogRow = {
  id: string
  budget_transaction_id: string | null
  parse_status: string
  parse_error?: string | null
  created_at: string
  attempt_started_at: string | null
  claimed?: boolean
}

const IMPORT_RECLAIM_AFTER_MS = 15 * 60 * 1000

type ResolvedCategory = {
  id: string
  bucket: string
}

export class NoActiveBudgetCycleError extends Error {
  constructor() {
    super('no_active_budget_cycle')
    this.name = 'NoActiveBudgetCycleError'
  }
}

/** The import id was already used for a different payment; retrying cannot succeed. */
export class ClientImportConflictError extends Error {
  constructor() {
    super('client_import_id_conflict')
    this.name = 'ClientImportConflictError'
  }
}

function canonicalCandidate(candidate: StructuredCandidate): string {
  return JSON.stringify([
    candidate.schemaVersion,
    candidate.clientImportId,
    candidate.provider,
    candidate.eventType,
    candidate.receiptId ?? '',
    candidate.reversedReceiptId ?? '',
    candidate.principalPesewas ?? '',
    candidate.feePesewas,
    new Date(candidate.receivedAt).toISOString(),
    candidate.counterparty?.trim().toLocaleLowerCase('en') ?? '',
    candidate.parserVersion,
  ])
}

export async function importStructuredCandidate(
  admin: SupabaseClient,
  userId: string,
  candidate: StructuredCandidate,
): Promise<SmsImportResult> {
  if (
    candidate.eventType === 'p2p_send' &&
    candidate.classification == null
  ) {
    return { ok: true, status: 'needs_review' }
  }
  if (
    candidate.eventType === 'unknown' ||
    (candidate.eventType !== 'reversal' && candidate.confidence !== 'high')
  ) {
    return { ok: true, status: 'needs_review' }
  }
  if (
    candidate.classification === 'transfer' ||
    candidate.classification === 'ignored' ||
    ['incoming', 'cash_out', 'bank_transfer', 'wallet_transfer', 'failed', 'pending'].includes(candidate.eventType)
  ) {
    return { ok: true, status: 'skipped' }
  }
  if (
    candidate.eventType !== 'reversal' &&
    !['merchant_payment', 'bill_payment', 'airtime_data', 'p2p_send'].includes(candidate.eventType)
  ) {
    return { ok: true, status: 'skipped' }
  }
  if (candidate.eventType === 'reversal') {
    // Persist the review outcome and its dedupe key in Postgres, so the native
    // queue does not retry an unlinked reversal forever.
  } else if (candidate.classification !== 'expense') {
    return { ok: true, status: 'needs_review' }
  }

  const { legacyDedupeKey: suppliedLegacyDedupeKey, ...candidateForStorage } = candidate
  const legacyDedupeKey = candidate.eventType === 'reversal'
    ? null
    : candidate.receiptId
      ? `${candidate.provider}:${candidate.receiptId}`
      : suppliedLegacyDedupeKey ?? null
  if (candidateForStorage.categoryId == null) {
    const categoryId = await resolveStructuredCategoryId(admin, userId, candidate)
    if (categoryId) candidateForStorage.categoryId = categoryId
  }

  let fallbackHmac: string | null = null
  if (!candidate.receiptId) {
    const secret = process.env.SMS_IMPORT_HMAC_SECRET
    if (!secret || secret.length < 32) {
      throw new Error('sms_import_hmac_secret_not_configured')
    }
    fallbackHmac = hmacSha256Hex(secret, `${userId}|${canonicalCandidate(candidate)}`)
  }
  const { data, error } = await admin.rpc('import_structured_momo_expense', {
    p_user_id: userId,
    p_candidate: legacyDedupeKey
      ? { ...candidateForStorage, legacyDedupeKey }
      : candidateForStorage,
    p_fallback_hmac: fallbackHmac,
  })
  if (error) {
    if (error.message.includes('no_active_budget_cycle')) {
      throw new NoActiveBudgetCycleError()
    }
    if (error.message.includes('client_import_id_conflict')) {
      throw new ClientImportConflictError()
    }
    throw error
  }
  const result = data as {
    status: SmsImportResult['status']
    importLogId?: string
    transactionId?: string
    feeTransactionId?: string
  }
  return { ok: true, ...result }
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === '23505'
}

async function resolveActiveCycleId(
  admin: SupabaseClient,
  userId: string,
  occurredAt?: string,
  includeLatestFallback = true,
): Promise<string | null> {
  const parsedDate = occurredAt ? new Date(occurredAt) : new Date()
  const today = (Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate).toISOString().slice(0, 10)

  const { data: inRange, error: inRangeError } = await admin
    .from('budget_cycles')
    .select('id')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inRangeError) throw inRangeError
  if (inRange?.id) return inRange.id
  if (!includeLatestFallback) return null

  const { data: latest, error: latestError } = await admin
    .from('budget_cycles')
    .select('id')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw latestError
  return latest?.id ?? null
}

async function resolveCategory(
  admin: SupabaseClient,
  userId: string,
  cycleId: string,
  parsed: ParsedSms,
  rawMessage = '',
): Promise<ResolvedCategory | null> {
  const { data, error } = await admin
    .from('budget_categories')
    .select('id, name, bucket')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data.length) return null

  const hit = pickCategoryForSms(data, parsed, rawMessage)
  if (!hit) return null
  return { id: hit.id, bucket: hit.bucket }
}

async function resolveStructuredCategoryId(
  admin: SupabaseClient,
  userId: string,
  candidate: StructuredCandidate,
): Promise<string | null> {
  const cycleId = await resolveActiveCycleId(admin, userId, candidate.receivedAt, false)
  if (!cycleId) return null

  const parsed: ParsedSms = {
    provider: candidate.provider,
    direction: 'expense',
    amount: candidate.principalPesewas == null ? null : candidate.principalPesewas / 100,
    fee: candidate.feePesewas / 100,
    counterparty: candidate.counterparty,
    reference: candidate.receiptId,
    txId: candidate.receiptId,
    balanceAfter: null,
    confidence: candidate.confidence,
    eventType: candidate.eventType,
  }
  const categoryContext = candidate.eventType === 'airtime_data'
    ? 'airtime data bundle'
    : candidate.eventType === 'bill_payment'
      ? 'bill utility'
      : ''
  const category = await resolveCategory(admin, userId, cycleId, parsed, categoryContext)
  return category?.id ?? null
}

function buildNote(parsed: ParsedSms): string {
  const who = parsed.counterparty?.trim() || 'Unknown'
  const suffix = parsed.txId ? ` (#${parsed.txId})` : ''
  return `MoMo → ${who}${suffix}`
}

function parseOccurredAt(receivedAt: string | undefined): string {
  if (receivedAt) {
    const d = new Date(receivedAt)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

async function fetchImportLogByDedupeKey(
  admin: SupabaseClient,
  userId: string,
  dedupeKey: string,
): Promise<ImportLogRow | null> {
  const { data, error } = await admin
    .from('sms_import_logs')
    .select('id, budget_transaction_id, parse_status, parse_error, created_at, attempt_started_at')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()

  if (error) throw error
  return data
}

function isStalePendingLog(row: ImportLogRow): boolean {
  const retryableState =
    ['pending', 'processing', 'retryable'].includes(row.parse_status) ||
    (row.parse_status === 'failed' && row.parse_error === 'Failed to create budget transaction')
  const startedAt = row.attempt_started_at ?? row.created_at
  const startedAtMs = Date.parse(startedAt)
  return retryableState &&
    row.budget_transaction_id == null &&
    Number.isFinite(startedAtMs) &&
    Date.now() - startedAtMs >= IMPORT_RECLAIM_AFTER_MS
}

async function repairPendingLogIfTransactionExists(
  admin: SupabaseClient,
  userId: string,
  row: ImportLogRow,
): Promise<ImportLogRow | null> {
  if (!isStalePendingLog(row)) return row

  const { data: tx, error: txLookupError } = await admin
    .from('budget_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('sms_import_log_id', row.id)
    .is('sms_import_group_id', null)
    .maybeSingle()

  if (txLookupError) throw txLookupError
  if (!tx?.id) return null

  const { error: repairError } = await admin
    .from('sms_import_logs')
    .update({
      parse_status: 'parsed',
      budget_transaction_id: tx.id,
    })
    .eq('id', row.id)

  if (repairError) throw repairError

  return {
    ...row,
    parse_status: 'parsed',
    budget_transaction_id: tx.id,
    claimed: false,
  }
}

async function findDuplicateLog(
  admin: SupabaseClient,
  userId: string,
  dedupeKey: string,
): Promise<ImportLogRow | null> {
  const data = await fetchImportLogByDedupeKey(admin, userId, dedupeKey)
  if (!data) return null

  // Recovery path: previous attempt may have created a transaction but failed to
  // finalize sms_import_logs. If so, repair the log and return the linked tx id.
  const repaired = await repairPendingLogIfTransactionExists(admin, userId, data)
  if (repaired) return repaired

  // Stale pending rows (crash before transaction insert) are recoverable, not duplicates.
  if (isStalePendingLog(data)) return null

  return data
}

function duplicateResult(
  existing: ImportLogRow,
  parsed: ParsedSms,
): SmsImportResult {
  const inFlight =
    ['pending', 'processing', 'retryable'].includes(existing.parse_status) &&
    existing.budget_transaction_id == null
  return {
    ok: true,
    status: inFlight ? 'retryable' : 'duplicate',
    importLogId: existing.id,
    transactionId: existing.budget_transaction_id ?? undefined,
    parsed,
    retryable: inFlight || undefined,
  }
}

async function insertImportLog(
  admin: SupabaseClient,
  userId: string,
  dedupeKey: string,
  parsed: ParsedSms,
  input: ImportMessageInput,
  row: {
    parse_status: ImportStatus | 'pending'
    parse_error?: string
  },
): Promise<ImportLogRow> {
  const isExpenseAttempt = row.parse_status === 'pending'
  const now = new Date().toISOString()
  const updateValues = {
    provider: parsed.provider,
    sender: input.sender ?? null,
    raw_message: input.message,
    parse_status: isExpenseAttempt ? 'processing' : row.parse_status,
    parse_error: row.parse_error ?? null,
    parsed,
    attempt_started_at: isExpenseAttempt ? now : null,
  }
  const selectFields = 'id, budget_transaction_id, parse_status, parse_error, created_at, attempt_started_at'
  const { data, error } = await admin
    .from('sms_import_logs')
    .insert({
      user_id: userId,
      dedupe_key: dedupeKey,
      ...updateValues,
    })
    .select(selectFields)
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      const existing = await fetchImportLogByDedupeKey(admin, userId, dedupeKey)
      if (existing && isStalePendingLog(existing)) {
        let claim = admin
          .from('sms_import_logs')
          .update(updateValues)
          .eq('id', existing.id)
          .eq('parse_status', existing.parse_status)
          .is('budget_transaction_id', null)
        if (existing.attempt_started_at) {
          claim = claim.eq('attempt_started_at', existing.attempt_started_at)
        } else {
          claim = claim.is('attempt_started_at', null).eq('created_at', existing.created_at)
        }
        const { data: reclaimed, error: reclaimError } = await claim
          .select(selectFields)
          .maybeSingle()
        if (reclaimError) throw reclaimError
        if (reclaimed) return { ...reclaimed, claimed: true }
      }
      const current = existing ?? await fetchImportLogByDedupeKey(admin, userId, dedupeKey)
      if (current) return { ...current, claimed: false }
    }
    throw error
  }

  return { ...data, claimed: true }
}

export async function importOneSmsMessage(
  admin: SupabaseClient,
  userId: string,
  input: ImportMessageInput,
): Promise<SmsImportResult> {
  const parsed = parseGhanaMoMoSms(input.message, input.sender)
  const dedupeKey = buildDedupeKey(parsed, input.message)

  const existing = await findDuplicateLog(admin, userId, dedupeKey)
  if (existing) {
    return duplicateResult(existing, parsed)
  }

  if (parsed.direction !== 'expense' || parsed.amount == null || parsed.amount <= 0) {
    const status: ImportStatus =
      parsed.direction === 'unknown' ||
      parsed.direction === 'income' ||
      parsed.direction === 'transfer'
        ? 'skipped'
        : 'failed'

    const parseError =
      parsed.direction === 'unknown'
        ? 'Not a MoMo transaction SMS'
        : status === 'failed'
          ? 'Could not parse expense amount from SMS'
          : `Skipped ${parsed.direction} message`

    const logRow = await insertImportLog(admin, userId, dedupeKey, parsed, input, {
      parse_status: status,
      parse_error: parseError,
    })

    if (!logRow.claimed) {
      return duplicateResult(logRow, parsed)
    }

    return {
      ok: true,
      status,
      importLogId: logRow.id,
      parsed,
      error: status === 'failed' ? 'Could not parse expense amount from SMS' : undefined,
    }
  }

  if (parsed.confidence === 'low') {
    const logRow = await insertImportLog(admin, userId, dedupeKey, parsed, input, {
      parse_status: 'failed',
      parse_error: 'Low confidence parse',
    })

    if (!logRow.claimed) {
      return duplicateResult(logRow, parsed)
    }

    return {
      ok: true,
      status: 'failed',
      importLogId: logRow.id,
      parsed,
      error: 'Low confidence parse',
    }
  }

  const cycleId = await resolveActiveCycleId(admin, userId, input.receivedAt)
  if (!cycleId) {
    throw new NoActiveBudgetCycleError()
  }

  const category = await resolveCategory(
    admin,
    userId,
    cycleId,
    parsed,
    input.message,
  )
  const occurredAt = parseOccurredAt(input.receivedAt)

  const logRow = await insertImportLog(admin, userId, dedupeKey, parsed, input, {
    parse_status: 'pending',
  })

  if (!logRow.claimed) {
    return duplicateResult(logRow, parsed)
  }
  const attemptStartedAt = logRow.attempt_started_at
  if (!attemptStartedAt) throw new Error('sms_import_attempt_claim_missing')

  const { data: txRow, error: txError } = await admin
    .from('budget_transactions')
    .insert({
      user_id: userId,
      cycle_id: cycleId,
      bucket: category?.bucket === 'needs' || category?.bucket === 'savings'
        ? category.bucket
        : 'wants',
      category_id: category?.id ?? null,
      amount: parsed.amount,
      note: buildNote(parsed),
      occurred_at: occurredAt,
      source: 'sms_webhook',
      sms_import_log_id: logRow.id,
    })
    .select('id')
    .single()

  if (txError) {
    if (isUniqueViolation(txError)) {
      const { data: existingTx, error: lookupError } = await admin
        .from('budget_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('sms_import_log_id', logRow.id)
        // The raw row, or the principal of a structured import that took this log over.
        .or('sms_import_group_id.is.null,sms_import_role.eq.principal')
        .maybeSingle()
      if (lookupError) throw lookupError
      if (existingTx?.id) {
        const { error: repairError } = await admin
          .from('sms_import_logs')
          .update({ parse_status: 'parsed', budget_transaction_id: existingTx.id })
          .eq('id', logRow.id)
        if (repairError) throw repairError
        return duplicateResult({ ...logRow, parse_status: 'parsed', budget_transaction_id: existingTx.id }, parsed)
      }
    }

    const { error: retryError } = await admin
      .from('sms_import_logs')
      .update({
        parse_status: 'retryable',
        parse_error: 'Failed to create budget transaction',
      })
      .eq('id', logRow.id)
      .eq('parse_status', 'processing')
      .eq('attempt_started_at', attemptStartedAt)

    if (retryError) throw retryError
    throw txError
  }

  const { data: finalized, error: finalizeError } = await admin
    .from('sms_import_logs')
    .update({
      parse_status: 'parsed',
      budget_transaction_id: txRow.id,
    })
    .eq('id', logRow.id)
    .eq('parse_status', 'processing')
    .eq('attempt_started_at', attemptStartedAt)
    .select('id')
    .maybeSingle()

  if (finalizeError) throw finalizeError
  if (!finalized) {
    const { data: currentTx, error: currentTxError } = await admin
      .from('budget_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('sms_import_log_id', logRow.id)
      .is('sms_import_group_id', null)
      .maybeSingle()
    if (currentTxError) throw currentTxError
    if (!currentTx?.id) throw new Error('sms_import_attempt_lost')
  }

  return {
    ok: true,
    status: 'parsed',
    importLogId: logRow.id,
    transactionId: txRow.id,
    parsed,
  }
}
