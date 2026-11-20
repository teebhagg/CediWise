import {
  defineEventHandler,
  readBody,
  setResponseHeaders,
  setResponseStatus,
  type H3Event,
} from 'nitro/h3'
import { authenticateSmsImportRequest, readAccessTokenFromEvent } from '../../lib/sms-import/auth'
import { createAdminClient } from '../../lib/supabase/admin'
import {
  importOneSmsMessage,
  importStructuredCandidate,
  ClientImportConflictError,
  NoActiveBudgetCycleError,
} from '../../lib/sms-import/insert'
import {
  smsImportBodySchema,
  type SmsImportBatchResult,
  type SmsImportResult,
} from '../../lib/sms-import/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, x-client-info, apikey, x-supabase-access-token, x-access-token',
}

function retryableBatchFailure(): SmsImportResult {
  return {
    ok: true,
    status: 'retryable',
    error: 'internal_error',
    errorCode: 'internal_error',
    retryable: true,
  }
}

function jsonResponse(event: H3Event, status: number, body: unknown) {
  setResponseStatus(event, status)
  setResponseHeaders(event, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  })
  return body
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, CORS_HEADERS)

  if (event.method === 'OPTIONS') {
    return ''
  }

  if (event.method !== 'POST') {
    return jsonResponse(event, 405, { ok: false, error: 'method_not_allowed' })
  }

  let rawBody: unknown
  try {
    rawBody = await readBody(event)
  } catch {
    return jsonResponse(event, 400, { ok: false, error: 'invalid_json' })
  }

  const parsedBody = smsImportBodySchema.safeParse(rawBody)
  if (!parsedBody.success) {
    const isCandidateError = parsedBody.error.issues.some((issue) =>
      issue.path[0] === 'candidate' || issue.path[0] === 'candidates',
    )
    return jsonResponse(event, 400, {
      ok: false,
      error: isCandidateError ? 'invalid_candidate' : 'invalid_payload',
      code: isCandidateError ? 'invalid_candidate' : 'invalid_payload',
      message: isCandidateError ? 'The structured transaction candidate is invalid.' : 'The SMS import payload is invalid.',
    })
  }

  const body = parsedBody.data
  const accessToken = readAccessTokenFromEvent(event)
  const auth = await authenticateSmsImportRequest(accessToken, body)

  if (!auth.ok) {
    return jsonResponse(event, auth.status, {
      ok: false,
      error: auth.message,
      code: auth.code,
    })
  }

  const admin = createAdminClient()

  const rawItems =
    body.messages ?? (body.message
      ? [
          {
            message: body.message,
            sender: body.sender,
            receivedAt: body.receivedAt,
          },
        ]
      : [])
  const structuredItems = body.candidates ?? (body.candidate ? [body.candidate] : [])

  const results: SmsImportResult[] = []
  const isBatchRequest = rawItems.length + structuredItems.length > 1

  for (const candidate of structuredItems) {
    try {
      results.push(await importStructuredCandidate(admin, auth.userId, candidate))
    } catch (err) {
      if (err instanceof NoActiveBudgetCycleError && !isBatchRequest) {
        return jsonResponse(event, 422, { ok: false, error: 'no_active_budget_cycle', message: 'Set up the budget cycle covering this transaction date before importing it.' })
      }
      if (err instanceof NoActiveBudgetCycleError) {
        results.push({
          ok: true,
          status: 'retryable',
          error: 'Set up a budget cycle covering this payment date, then retry.',
          errorCode: 'no_active_budget_cycle',
          retryable: true,
        })
        continue
      }
      if (err instanceof ClientImportConflictError) {
        // Terminal: the same import id arrived with a different payment, so a retry cannot succeed.
        results.push({
          ok: true,
          status: 'failed',
          error: 'This import id was already used for a different payment.',
          errorCode: 'client_import_conflict',
          retryable: false,
        })
        continue
      }
      console.error('[sms-import:structured]', err)
      if (!isBatchRequest) {
        return jsonResponse(event, 503, {
          ok: false,
          error: 'service_unavailable',
          code: 'sms_import_unavailable',
          retryable: true,
        })
      }
      results.push(retryableBatchFailure())
    }
  }

  for (const item of rawItems) {
    try {
      const result = await importOneSmsMessage(admin, auth.userId, item)
      results.push(result)
    } catch (err) {
      if (isBatchRequest) {
        if (err instanceof NoActiveBudgetCycleError) {
          results.push({
            ok: true,
            status: 'retryable',
            error: 'Set up a budget cycle covering this payment date, then retry.',
            errorCode: 'no_active_budget_cycle',
            retryable: true,
          })
          continue
        }

        console.error('[sms-import]', err)
        results.push(retryableBatchFailure())
        continue
      }

      if (err instanceof NoActiveBudgetCycleError) {
        return jsonResponse(event, 422, {
          ok: false,
          error: 'no_active_budget_cycle',
          message:
            'Set up an active budget cycle before importing MoMo expenses.',
        })
      }

      console.error('[sms-import]', err)
      return jsonResponse(event, 500, { ok: false, error: 'internal_error' })
    }
  }

  if (results.length === 1) {
    return jsonResponse(event, 200, results[0])
  }

  const summary = results.reduce(
    (acc, row) => {
      acc[row.status] += 1
      return acc
    },
    { parsed: 0, duplicate: 0, skipped: 0, failed: 0, needs_review: 0, retryable: 0, reversed: 0 } as Record<
      SmsImportResult['status'],
      number
    >,
  )

  const batch: SmsImportBatchResult = {
    ok: true,
    results,
    summary: {
      total: results.length,
      parsed: summary.parsed,
      duplicate: summary.duplicate,
      skipped: summary.skipped,
      failed: summary.failed,
      needs_review: summary.needs_review,
      retryable: summary.retryable,
      reversed: summary.reversed,
    },
  }

  return jsonResponse(event, 200, batch)
})
