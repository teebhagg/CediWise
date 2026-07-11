import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { buildDedupeKey, parseGhanaMoMoSms } from './parser'
import type { ImportStatus, ParsedSms, SmsImportResult } from './types'

type ImportMessageInput = {
  message: string
  sender?: string
  receivedAt?: string
}

type ImportLogRow = {
  id: string
  budget_transaction_id: string | null
  parse_status: string
}

export class NoActiveBudgetCycleError extends Error {
  constructor() {
    super('no_active_budget_cycle')
    this.name = 'NoActiveBudgetCycleError'
  }
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === '23505'
}

async function resolveActiveCycleId(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10)

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

async function resolveCategoryId(
  admin: SupabaseClient,
  userId: string,
  cycleId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('budget_categories')
    .select('id, name, bucket')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data?.length) return null

  const preferredNames = ['others', 'transport', 'groceries']
  for (const name of preferredNames) {
    const hit = data.find((row) => row.name?.toLowerCase() === name)
    if (hit?.id) return hit.id
  }

  const wants = data.find((row) => row.bucket === 'wants')
  return wants?.id ?? data[0]?.id ?? null
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
    .select('id, budget_transaction_id, parse_status')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle()

  if (error) throw error
  return data
}

function isStalePendingLog(row: ImportLogRow): boolean {
  return row.parse_status === 'pending' && row.budget_transaction_id == null
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
  return {
    ok: true,
    status: 'duplicate',
    importLogId: existing.id,
    transactionId: existing.budget_transaction_id ?? undefined,
    parsed,
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
  const { data, error } = await admin
    .from('sms_import_logs')
    .insert({
      user_id: userId,
      provider: parsed.provider,
      sender: input.sender ?? null,
      raw_message: input.message,
      parse_status: row.parse_status,
      parse_error: row.parse_error ?? null,
      parsed,
      dedupe_key: dedupeKey,
    })
    .select('id, budget_transaction_id, parse_status')
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      const existing = await fetchImportLogByDedupeKey(admin, userId, dedupeKey)
      if (existing) return existing
    }
    throw error
  }

  return data
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

    if (logRow.parse_status !== status) {
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

    if (logRow.parse_status !== 'failed') {
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

  const cycleId = await resolveActiveCycleId(admin, userId)
  if (!cycleId) {
    throw new NoActiveBudgetCycleError()
  }

  const categoryId = await resolveCategoryId(admin, userId, cycleId)
  const occurredAt = parseOccurredAt(input.receivedAt)

  const logRow = await insertImportLog(admin, userId, dedupeKey, parsed, input, {
    parse_status: 'pending',
  })

  if (logRow.parse_status !== 'pending') {
    return duplicateResult(logRow, parsed)
  }

  const { data: txRow, error: txError } = await admin
    .from('budget_transactions')
    .insert({
      user_id: userId,
      cycle_id: cycleId,
      bucket: 'wants',
      category_id: categoryId,
      amount: parsed.amount,
      note: buildNote(parsed),
      occurred_at: occurredAt,
      source: 'sms_webhook',
      sms_import_log_id: logRow.id,
    })
    .select('id')
    .single()

  if (txError) {
    await admin
      .from('sms_import_logs')
      .update({
        parse_status: 'failed',
        parse_error: 'Failed to create budget transaction',
      })
      .eq('id', logRow.id)

    throw txError
  }

  const { error: finalizeError } = await admin
    .from('sms_import_logs')
    .update({
      parse_status: 'parsed',
      budget_transaction_id: txRow.id,
    })
    .eq('id', logRow.id)

  if (finalizeError) throw finalizeError

  return {
    ok: true,
    status: 'parsed',
    importLogId: logRow.id,
    transactionId: txRow.id,
    parsed,
  }
}
