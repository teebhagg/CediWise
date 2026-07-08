import {
  defineEventHandler,
  getHeader,
  readBody,
  setResponseHeaders,
  setResponseStatus,
  type H3Event,
} from 'nitro/h3'
import { authenticateSmsImportRequest, readAuthorizationHeader } from '../../lib/sms-import/auth'
import { createAdminClient } from '../../lib/supabase/admin'
import {
  importOneSmsMessage,
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
    'authorization, content-type, x-client-info, apikey',
}

function retryableBatchFailure(): SmsImportResult {
  return {
    ok: true,
    status: 'failed',
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
    return jsonResponse(event, 400, {
      ok: false,
      error: 'invalid_payload',
      details: parsedBody.error.flatten(),
    })
  }

  const body = parsedBody.data
  const auth = await authenticateSmsImportRequest(
    readAuthorizationHeader(event),
    body,
  )

  if (!auth.ok) {
    return jsonResponse(event, auth.status, {
      ok: false,
      error: auth.message,
      code: auth.code,
    })
  }

  const admin = createAdminClient()

  const items =
    body.messages ??
    (body.message
      ? [
          {
            message: body.message,
            sender: body.sender,
            receivedAt: body.receivedAt,
          },
        ]
      : [])

  const results: SmsImportResult[] = []
  const isBatchRequest = items.length > 1

  for (const item of items) {
    try {
      const result = await importOneSmsMessage(admin, auth.userId, item)
      results.push(result)
    } catch (err) {
      if (isBatchRequest) {
        if (err instanceof NoActiveBudgetCycleError) {
          results.push({
            ok: true,
            status: 'failed',
            error:
              'Set up an active budget cycle before importing MoMo expenses.',
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
    { parsed: 0, duplicate: 0, skipped: 0, failed: 0 } as Record<
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
    },
  }

  return jsonResponse(event, 200, batch)
})
